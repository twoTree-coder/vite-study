const Koa = require('koa');
const fs = require('fs');
const path = require('path');
const compilerSFC = require('@vue/compiler-sfc');
const compilerDOM = require('@vue/compiler-dom')

const app = new Koa();

app.use(async (ctx) => {
  const { url, query } = ctx;
  // 首页请求
  if (url === '/') {
    ctx.type = 'text/html';
    ctx.body = fs.readFileSync('./index.html', 'utf-8');
  } else if (url.endsWith('.js')) {
    // js文件的加载处理
    const p = path.join(__dirname, url);
    ctx.type = 'application/javascript';
    ctx.body = rewriteImport(fs.readFileSync(p, 'utf-8'));
  } else if (url.startsWith('/@modules')) {
    // 裸模块名称
    const moduleName = url.replace('/@modules/', '');
    // 去node_modules里面去找
    const prefix = path.join(__dirname, 'node_modules', moduleName);
    // package.json中获取module字段
    const module = require(prefix + '/package.json').module;
    const filePath = path.join(prefix, module);
    const res = rewriteImport(fs.readFileSync(filePath, 'utf-8'));
    ctx.type = 'application/javascript';
    ctx.body = res;
  } else if (url.includes('.vue')) {
    // 是一次SFC请求
    // 读取vue文件，解析为js
    const p = path.join(__dirname, url.split('?')[0]);
    const content = compilerSFC.parse(fs.readFileSync(p, 'utf-8'));
    // 获取SFC的内容
    if (!query.type) {
      // 获取脚本内容
      const contentScript = content.descriptor.script.content;
      // 替换默认导出为一个常量，方便后续修改
      const script = contentScript.replace(
        'export default',
        'const __script ='
      );
      ctx.type = 'application/javascript';
      ctx.body = `
        ${rewriteImport(script)}
        // 解析template
        import { render as __render } from '${url}?type=template'
        __script.render = __render
        export default __script
      `;
    } else if(query.type === 'template') {
      const tpl = content.descriptor.template.content
      const render = compilerDOM.compile(tpl, {mode: 'module'}).code
      console.log(render)
      ctx.type = 'application/javascript'
      ctx.body = rewriteImport(render)
    }
  }
});

// 裸模块地址重写
const rewriteImport = (content) => {
  return content.replace(/ from ['"](.*)['"]/g, (s1, s2) => {
    if (s2.startsWith('./') || s2.startsWith('/') || s2.startsWith('../')) {
      return s1;
    } else {
      // 裸模块，替换
      return ` from '/@modules/${s2}'`;
    }
  });
};

app.listen(3000, () => {
  console.log('kvite is startup !!');
});

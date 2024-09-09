# umi plugin for figma plugin dev

可以在配置 figma 中配置，也可以在根目录的 manifest.json 文件中，定义 figma plugin。

figma 插件 js 入口为 src/figma.ts 文件页面的入口为 src/pages/index/index.tsx 因为 figma 插件是单页面应用，所以其他路由都用不上

> 仅支持 umi build 命令，暂不支持 dev

## Install

```bash
$ npm i @alita/umi-plugin-figma -D
```

## Usage

Enable by config.

```ts
import { defineConfig } from 'umi';

interface FigmaManiFest {
  name?: string;
  id?: string;
  api?: string;
  main?: string;
  capabilities?: any[];
  enableProposedApi?: boolean;
  documentAccess?: string;
  editorType?: string[];
  ui?: string;
  networkAccess?: {
    allowedDomains?: string[];
  };
}

export default defineConfig({
  plugins:['@alita/umi-plugin-figma'],
  figma: FigmaManiFest,
});
```

## LICENSE

MIT

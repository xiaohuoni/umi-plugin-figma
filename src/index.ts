import { AlitaApi } from '@alita/types';
import { fsExtra, logger, winPath } from '@umijs/utils';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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

const manifestFileName = 'manifest.json';
export default function (api: AlitaApi) {
  api.describe({
    key: 'figma',
    config: {
      schema({ zod }) {
        return zod.object({});
      },
    },
  });
  let manifestJson: FigmaManiFest = {};
  const manifest = winPath(join(api.paths.cwd, manifestFileName));
  const hasManifestFile = existsSync(manifest);
  if (hasManifestFile) {
    manifestJson = require(manifest) as FigmaManiFest;
  }
  if (manifestJson.main) {
    logger.warn(
      'manifest.json 中配置的 main 无效，因为会被插件修改为真正的主入口。',
    );
  }
  if (manifestJson.ui) {
    logger.warn(
      'manifest.json 中配置的 ui 无效，因为会被插件修改为真正的主入口。',
    );
  }
  const { figma } = api.userConfig;
  // manifest.json 由根目录文件和配置合并
  const figmaManifest = { ...manifestJson, ...figma };
  api.modifyConfig((memo: any) => {
    memo.mpa = {
      getConfigFromEntryFile: true,
      entry: {
        index: { },
      },
    };
    return memo;
  });
  api.modifyEntry((memo) => {
    const figmaCode = winPath(join(api.paths.absSrcPath, 'figma.ts'));
    if (existsSync(figmaCode)) {
      memo.code = figmaCode;
    }
    return memo;
  });
  const supportFigma = ()=>{
      figmaManifest.main = 'code.js';
      figmaManifest.ui = 'index.html';
      const outputFile = winPath(
        join(api.paths.absOutputPath, manifestFileName),
      );
      fsExtra.writeJSONSync(outputFile, figmaManifest);
      // inject scripts
      const htmlPath = winPath(join(api.paths.absOutputPath, 'index.html'));
      if (existsSync(htmlPath)) {
        let html = readFileSync(htmlPath, 'utf-8').toString();
        const scriptTags =
          html.match(/<script\s+defer\s+src="([^"]+)"><\/script>/g) || [];
        for (let index = 0; index < scriptTags.length; index++) {
          const tag = scriptTags[index];
          const src = tag.match(/src="([^"]+)"/)?.[1] || 'index.js';
          const jsPath = winPath(join(api.paths.absOutputPath, src));
          const jsStr = readFileSync(jsPath, 'utf-8').toString();
          // c.replace(Je, "$&/")  ??
          // const str = 'c.replace(Je, "$&/")';
          // const aa = `abcdeffdasdas`.replace('ffd', `asd${str}da`);
          // console.log(aa)
          // 期望 abcdec.replace(Je, "$&/")asdas
          // 结果 abcdeasdc.replace(Je, "ffd/")daasdas
          // html = html.replace(tag, '<script type="module">'+jsStr+'</script>');
          const [f, ...other] = html.split(tag);
          html = [
            f,
            '<script type="module">',
            jsStr,
            '</script>',
            ...other,
          ].join('');
        }

        writeFileSync(htmlPath, html, 'utf-8');
        logger.info(
          '构建完成，请从 Figma - Plugins - Development - Import plugin from manifest... 选择 dist/manifest.json',
        );
      } else {
        logger.error(
          '构建失败，未生成 index.html, 需要页面入口文件 pages/index/index.tsx',
        );
        return;
      }
  }

  api.onBuildComplete(async ({ err, stats }) => {
    if (!err) {
      supportFigma();
    }
  });
}

import { AlitaApi } from '@alita/types';
import { fsExtra, logger, winPath } from '@umijs/utils';
import { existsSync } from 'fs';
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
    memo.hash = false;
    memo.jsMinifier = 'none';
    // This is necessary because Figma's 'eval' works differently than normal eval
    memo.devtool =
      process.env.NODE_ENV === 'development' ? 'inline-source-map' : false;
    memo.mfsu = false;
    memo.mpa = {
      getConfigFromEntryFile: false,
      entry: {
        index: {},
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

  api.chainWebpack((memo) => {
    memo.plugins.delete('hmr');
    (api.appData.mpa!.entry as any[]).forEach((entry) => {
      memo.plugin(`html-${entry.name}`).use(require('html-webpack-plugin'), [
        {
          filename: `${entry.name}.html`,
          minify: false,
          template: join(api.paths.absTmpPath, 'mpa/template.html'),
          inlineSource: '.(js|css)$',
          templateParameters: entry,
          scriptLoading: 'module',
          chunks: [entry.name],
        },
      ]);
    });
    memo
      .plugin('inline-source')
      .use(require('html-inline-script-webpack-plugin'), [
        {
          htmlMatchPattern: [/index.html/],
          scriptMatchPattern: [/.js$/],
        },
      ]);
    return memo;
  });

  const supportFigma = () => {
    figmaManifest.main = 'code.js';
    figmaManifest.ui = 'index.html';
    const outputFile = winPath(join(api.paths.absOutputPath, manifestFileName));
    fsExtra.writeJSONSync(outputFile, figmaManifest);
    logger.info(
      '构建完成，请从 Figma - Plugins - Development - Import plugin from manifest... 选择 dist/manifest.json',
    );
  };

  api.onDevCompileDone(async ({ stats }) => {
    supportFigma();
  });
  api.onBuildComplete(async ({ stats }) => {
    supportFigma();
  });
}

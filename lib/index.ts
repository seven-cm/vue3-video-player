import videoPlay from "./videoPlay/index.vue";
import "./utils/rem";
// 动态导入所有 SVG 文件
const svgModules = import.meta.glob('./assets/icon/svg/*.svg', { eager: true });

// 如果需要将导入的文件存储到一个数组中
const svgFiles = Object.values(svgModules).map(module => module.default);

// 为组件提供 install 安装方法，供按需引入
function install(app) {
  app.component(videoPlay.name, videoPlay);
}
videoPlay.install = install;
// 默认导出组件
export { videoPlay, install };
export default videoPlay;

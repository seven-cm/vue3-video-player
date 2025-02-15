<template>
  <div class="player-wrap" :style="videoStyle" ref="refPlayerWrap" @mousemove="mouseMovewWarp"
    @mouseleave="state.isVideoHovering = false" :class="{
      'player-wrap-hover': state.playBtnState === 'play' || state.isVideoHovering,
      'is-lightsOff': state.lightsOff,
      'web-full-screen': state.webFullScreen,
    }">
    <!-- 播放器 -->
    <div class="player-video">

      <video ref="videoRef" class="player-video-main" :class="{ 'video-mirror': state.mirror }" v-bind="videoEvents"
        :controls="isMobile && state.speed ? true : false" :muted="state.muted" :volume="state.volume"
        :autoplay="autoPlay" :loop="state.loop" :src="src" :poster="state.poster" :webkit-playsinline="playsinline"
        :playsinline="playsinline" x-webkit-airplay="allow">
        您的浏览器不支持video标签!
      </video>
    </div>

    <!-- 状态栏 移动端不显示-->
    <div class="player-state" v-if="!isMobile">
      <!-- 播放按钮 -->
      <div class="play-btn" :class="{ 'dplayer-bezel-transition': isMeb }">
        <SvgIcon :icon="state.playBtnState" :size="40"></SvgIcon>
      </div>
    </div>

    <!-- 操作信息通知 -->
    <PlayStatus :state="state"></PlayStatus>

    <!-- 默认poster & 截图 -->
    <canvas ref="Canvas" id="myCanvas" style="display: none"></canvas>

    <!-- 全屏模式&&鼠标滑过 顶部显示的内容 -->
    <PlayTop :title="props.title" v-show="state.fullScreen && state.isTop"></PlayTop>

    <!-- 加载效果 -->
    <PlayLoading :loadType="state.loadStateType" />

    <!-- 黑幕关灯模式 -->
    <transition name="d-fade-in">
      <div class="player-lightsOff" v-show="state.lightsOff"></div>
    </transition>

    <!-- 快捷键控制(移动端不显示) -->
    <input v-if="!isMobile" type="input" readonly ref="refInput" @dblclick="toggleFullScreenPlay"
      @keyup.f="toggleFullScreenPlay" @keyup.esc="state.webFullScreen = false" @click="togglePlay"
      @keydown.space="togglePlay" @keyup="keypress" @keydown.arrow-left="keydownLeft"
      @keydown.arrow-up.arrow-down="volumeKeydown" @keydown="keypress" class="player-input" maxlength="0" />

    <!-- 控制器 -->
    <div class="player-controller">
      <!-- 进度条 -->
      <div class="control-progress">
        <ControlsProgress class="progress-bar" :disabled="!state.speed" :hoverText="state.progressCursorTime"
          @change="progressChange" @onMousemove="onProgressMove" :size="'100%'" v-model="state.playProgress"
          :preload="state.preloadBar"></ControlsProgress>
      </div>
      <!-- 控制工具 -->
      <div class="control-tool">
        <div class="tool-bar tool-barplayer-icons-left">
          <!-- 播放 -->
          <div class="tool-item" @click="togglePlay">
            <SvgIcon :icon="state.playBtnState" className="play"></SvgIcon>
          </div>

          <!-- 音量 -->
          <div class="tool-item tool-sound" @click="mutedPlay">
            <SvgIcon :icon="state.volume == 0 || state.muted
              ? 'volume-off'
              : state.volume > 0.5
                ? 'volume-up'
                : 'volume-down'
              " className="sound"></SvgIcon>
          </div>
          <div class="tool-item volume-box" v-if="props.controlBtns.includes('volume')">
            <div :class="{ 'is-muted': state.muted }">
              <ControlsProgress class="progress-bar" @change="state.muted = false" :hover="false" size="100%"
                v-model="state.volume" :isSound="true">
              </ControlsProgress>
            </div>
          </div>

          <!-- 时间 -->
          <div class="tool-item tool-time" v-if="props.controlBtns.includes('audioTrack')">
            <span>{{ state.currentTime }}</span>
            <span style="margin: 0 3px">/</span>
            <span class="total-time">{{ state.totalTime }}</span>
          </div>
        </div>

        <div class="tool-bar dplayer-icons-right">
          <!-- 清晰度 -->
          <div class="tool-item quality-btn" v-if="state.qualityLevels.length && props.controlBtns.includes('quality')">
            {{
              state.qualityLevels.length &&
              qualityLevelsFiter(state.qualityLevels[state.currentLevel].name)
            }}
            <div class="tool-item-main">
              <ul class="speed-main" style="text-align: center">
                <li :class="{ 'speed-active': state.currentLevel == index }" v-for="(row, index) of state.qualityLevels"
                  :key="row" @click="qualityLevelsHandle(row, index)">
                  {{ qualityLevelsFiter(row.name) }}
                </li>
              </ul>
            </div>
          </div>

          <!-- 倍速播放 -->
          <div class="tool-item speedRate-btn" v-if="props.controlBtns.includes('speedRate')">
            {{ state.speedActive == "1.0" ? "倍速" : state.speedActive + "x" }}
            <div class="tool-item-main">
              <ul class="speed-main">
                <li :class="{ 'speed-active': state.speedActive == row }" v-for="row of state.speedRate"
                  :key="row as string" @click="playbackRate(row)">
                  {{ row }}x
                </li>
              </ul>
            </div>
          </div>

          <!-- 截图 -->
          <div class="tool-item pip-btn" @click="screenShot">
            <SvgIcon icon="screenshot" class="screenshot"></SvgIcon>
            <div class="tool-item-main">截图</div>
          </div>

          <!-- 设置 -->
          <div class="tool-item setting-btn" v-if="props.controlBtns.includes('setting')">
            <SvgIcon icon="settings" class="rotateHover"></SvgIcon>
            <div class="tool-item-main">
              <ul class="speed-main">
                <li>
                  镜像画面
                  <PlaySwitch v-model="state.mirror" />
                </li>
                <li>
                  循环播放
                  <PlaySwitch v-model="state.loop" />
                </li>
                <li>
                  关灯模式
                  <PlaySwitch v-model="state.lightsOff" />
                </li>
              </ul>
            </div>
          </div>

          <!-- 画中画 -->
          <div class="tool-item pip-btn" @click="requestPictureInPicturePlay" v-if="props.controlBtns.includes('pip')">
            <!-- <d-icon size="20" icon="icon-pip"></d-icon> -->
            <SvgIcon icon="hzh"></SvgIcon>
            <div class="tool-item-main">画中画</div>
          </div>

          <!-- 网页全屏 -->
          <div class="tool-item pip-btn" v-if="props.controlBtns.includes('pageFullScreen')"
            @click="state.webFullScreen = !state.webFullScreen">
            <!-- <d-icon size="20" icon="icon-web-screen"></d-icon> -->
            <SvgIcon icon="fullscreen"></SvgIcon>
            <div class="tool-item-main">网页全屏</div>
          </div>

          <!-- 全屏 -->
          <div class="tool-item fullScreen-btn" @click="toggleFullScreenPlay"
            v-if="props.controlBtns.includes('fullScreen')">
            <div class="tool-item-main">全屏</div>
            <SvgIcon icon="Bfullscreen" className="bfullscreen"></SvgIcon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import SvgIcon from "../components/SvgIcon.vue";
import ControlsProgress from "../components/ControlsProgress.vue";
import PlaySwitch from "../components/PlaySwitch.vue";
import PlayLoading from "../components/PlayLoading.vue";
import PlayTop from "../components/PlayTop.vue";
import PlayStatus from "../components/PlayStatus.vue";
import {
  reactive,
  ref,
  onMounted,
  watch,
  nextTick,
  onBeforeUnmount,
  useAttrs,
  computed,
} from "vue";
import { debounce } from "throttle-debounce";
import { defaultProps, videoEmits } from "./types";
import {
  isMobile,
  timeFormat,
  requestPictureInPicture,
  toggleFullScreen,
  firstUpperCase,
} from "../utils/util";
import Hlsjs from "hls.js";
import variables from "../assets/style/variables.module.scss";
import { px2rem } from "../utils/rem";
const props = defineProps(defaultProps);
// console.log(variables);

const state = reactive<any>({
  ...props, //如果有自定义配置就会替换默认配置
  playBtnState: props.autoPlay ? "pause" : "play", // 播放按钮状态
  loadStateType: "loadstart", // 加载状态
  fullScreen: false,
  handleType: "", //当前操作类型
  currentTime: "00:00:00", //当前播放时间
  preloadBar: 0, // 当前缓冲进度
  totalTime: "00:00:00", //总时长
  isVideoHovering: true, //鼠标是否在视频上
  speedActive: "1.0", //倍速
  playProgress: 0, //播放进度
  isMultiplesPlay: false, //是否倍速播放
  longPressTimeout: null,
  progressCursorTime: "00:00:00", //进度条光标时间
  qualityLevels: [], //分辨率数组
  currentLevel: 0, //首选分辨率
  poster: props.poster || "", //封面图
  isTop: true,
});

const emits = defineEmits([...videoEmits, "mirrorChange", "loopChange", "lightOffChange"]);

// 播放器实例
const videoRef = ref<HTMLVideoElement>();
// 全屏实例
const refPlayerWrap = ref<HTMLElement>();
// canvas实例
const Canvas = ref<HTMLCanvasElement | null>();
// input实例
const refInput = ref<HTMLInputElement>();

const compose =
  (...args) =>
    (value) =>
      args.reduceRight((acc, fn) => fn(acc), value);

const isMeb = ref<boolean>(false);

const videoStyle = computed(() => {
  return {
    width: px2rem(props.width),
    height: px2rem(props.height),
  };
});

// 计算清晰度
const qualityLevelsFiter = (name) => {
  switch (name) {
    case "380":
      name = name + " 清晰";
      break;
    case "480":
      name = name + " 流畅";
      break;
    case "720":
      name = name + " 高清";
      break;
    case "1080":
      name = name + " 超清";
      break;
    default:
      name = name + " 原画";
  }
  return name;
};

// 收集video事件
const videoEvents: any = videoEmits.reduce((events, emit) => {
  let name = `on${firstUpperCase(emit)}`;
  events[name] = (ev) => {
    state.loadStateType = emit; //加载状态
    emits(emit, ev);
  };
  return events;
}, {});

// 可以播放
videoEvents["onCanplay"] = compose(videoEvents["onCanplay"], () => {
  if (state.playBtnState !== "play") {
    if (videoRef.value) {
      videoRef.value.play();
    }
  }
  if (state.autoPlay) {
    if (videoRef.value) {
      videoRef.value.play();
    }
    state.playBtnState = "pause";
  }
});

// 播放结束
videoEvents["onEnded"] = compose(videoEvents["onEnded"], () => {
  state.playBtnState = "replay"; //此时的控制按钮应该显示重新播放
});

// 播放时间改变触发，没使用compose是因为要获取到ev,同时loadStateType不应该改变
videoEvents["onTimeupdate"] = (ev) => {
  emits("timeupdate", ev);
  let duration = ev.duration || ev.target.duration || 0; // 媒体总长
  let currentTime = ev.currentTime || ev.target.currentTime; // 当前媒体播放长度
  state.playProgress = currentTime / duration; //播放进度比例
  state.currentTime = timeFormat(currentTime);
  state.totalTime = timeFormat(duration);
};

// 资源长度改变
videoEvents["onDurationchange"] = (ev) => {
  emits("durationchange", ev);
  if (props.currentTime !== 0 && videoRef.value) {
    videoRef.value.currentTime = props.currentTime;
  }
  //更新当前时长的所有状态
  videoEvents.onTimeupdate(ev);
};

// 缓冲下载中
videoEvents["onProgress"] = (ev) => {
  console.log("缓冲中...");
  emits("progress", ev);
  let duration = ev.target.duration; // 媒体总长
  let length = ev.target.buffered;
  let end = ev.target.buffered.length && ev.target.buffered.end(length - 1);
  state.preloadBar = end / duration; //缓冲比例
};

// error
videoEvents["onError"] = compose(videoEvents["onError"], () => {
  state.playBtnState = "replay"; //此时的控制按钮应该显示重新播放
});

// loadeddata,媒体的第一帧已经加载完毕
videoEvents["onLoadeddata"] = () => {
  const ctx = Canvas.value?.getContext("2d");
  // 指定要获取的视频时间（单位：秒）
  const specifiedTime = 1; // 获取视频的第1秒
  // 当视频当前时间大于等于指定的时间时
  if (specifiedTime >= 1 && state.poster === "") {
    if (!(videoRef.value && Canvas.value)) return;
    // 从指定时间开始播放视频
    videoRef.value.currentTime = specifiedTime;
    // 将视频的宽度和高度设置为canvas的尺寸
    Canvas.value.setAttribute("width", videoRef.value.videoWidth + "");
    Canvas.value.setAttribute("height", videoRef.value.videoHeight + "");
    // 在canvas上绘制当前帧的画面
    ctx?.drawImage(videoRef.value, 0, 0, videoRef.value.videoWidth, videoRef.value.videoHeight);
    // 将canvas图像转换成Base64编码的图片URL
    const img = Canvas.value.toDataURL("image/jpeg");
    state.poster = img as string;
    Canvas.value = null;
  }
};

// 获取用户自定义事件
let attrs = useAttrs();
for (let emit in attrs) {
  videoEvents[emit] = attrs[emit];
}

/**
 * 播放暂停切换
 */
const togglePlay = (ev) => {
  isMeb.value = false;
  if (ev) ev.preventDefault();
  if (state.playBtnState === "play" || state.playBtnState === "replay") {
    // 点击播放按钮 或 重新播放按钮 后
    playVideo();
  } else if (state.playBtnState == "pause") {
    // 点击暂停按钮后
    pauseVideo();
  }
  setTimeout(() => {
    isMeb.value = true;
  }, 0);
};

/**
 * 播放
 */
const playVideo = () => {
  state.loadStateType = "play";
  videoRef.value?.play().catch(() => {
    setTimeout(() => {
      state.playBtnState = "replay";
      state.loadStateType = "error";
    }, 500);
  });
  state.playBtnState = "pause";
};

/**
 * 暂停
 */
const pauseVideo = () => {
  videoRef.value?.pause();
  state.playBtnState = "play"; // 暂停后要显示播放按钮
};

/**
 * 静音切换
 */
const mutedPlay = () => {
  state.muted = !state.muted;
  // 如果之前音量调整为0 取消静音时会把音量设置为5
  if (state.volume === 0) {
    state.volume = 0.05;
  }
};

/**
 * 进度条移动设置提示框时间
 */
const onProgressMove = (ev: Event, val: number) => {
  if (videoRef.value) {
    // generatePreviewImage(videoRef.value.duration * val)
    state.progressCursorTime = timeFormat(videoRef.value.duration * val);
  }
};

/**
 * 进度条改变
 */
const progressChange = (ev: Event, val: number) => {
  if (videoRef.value) {
    let duration = videoRef.value.duration; // 媒体总长
    videoRef.value.currentTime = duration * val;
    if (state.playBtnState === "play") {
      videoRef.value.play();
      state.playBtnState = "pause";
    }
  }
};

/**
 * 控制器显示隐藏控制
 */
const hideControl = debounce(1500, () => {
  state.isVideoHovering = false;
  if (state.playBtnState !== "play") {
    state.isTop = false; //控制top的显示隐藏
  }
  if (videoRef.value) videoRef.value.style.cursor = "none";
});
const mouseMovewWarp = () => {
  if (videoRef.value) videoRef.value.style.cursor = "auto";
  state.isVideoHovering = true;
  state.isTop = true; //控制top的显示隐藏
  hideControl();
};

/**
 * 截图
 */
const screenShot = async () => {
  if (videoRef.value) {
    const ctx = Canvas.value?.getContext("2d");
    // 将视频的宽度和高度设置为canvas的尺寸
    Canvas.value?.setAttribute("width", videoRef.value.videoWidth + "");
    Canvas.value?.setAttribute("height", videoRef.value.videoHeight + "");
    // 在canvas上绘制当前帧的画面
    ctx?.drawImage(videoRef.value, 0, 0, videoRef.value.videoWidth, videoRef.value.videoHeight);
    const blob = await new Promise((resolve) => Canvas.value?.toBlob(resolve, "image/png"));

    const url = URL.createObjectURL(blob as Blob);
    // 创建a标签
    const a = document.createElement("a");
    // 创建鼠标事件
    const event = new MouseEvent("click");
    // 指定下载的文件名
    a.download = "截图.png";
    // a标签的href属性指定下载的文件地址
    a.href = url;
    // 触发a标签的点击事件
    a.dispatchEvent(event);
    // 释放掉blob对象
    URL.revokeObjectURL(url);
    // 释放掉canvas对象
    Canvas.value = null;
    // 卸载a标签的点击事件
    a.onclick = null;
    // 释放掉a标签
    a.remove();
  }
};

/**
 * 画中画
 */
const requestPictureInPicturePlay = () => {
  if (videoRef.value) {
    videoRef.value.addEventListener("play", handlePlay); // 监听播放事件
    videoRef.value.addEventListener("pause", handlePause); // 监听暂停事件
    videoRef.value.addEventListener("leavepictureinpicture", handleLeavePiP); // 监听退出画中画事件
  }
  requestPictureInPicture(videoRef.value as HTMLVideoElement);
};
const handlePlay = () => {
  if (document.pictureInPictureElement) {
    state.playBtnState = "pause";
  }
};
const handlePause = () => {
  if (document.pictureInPictureElement) {
    state.playBtnState = "play";
  }
};
const handleLeavePiP = () => {
  videoRef.value?.removeEventListener("play", handlePlay);
  videoRef.value?.removeEventListener("pause", handlePause);
  videoRef.value?.removeEventListener("leavepictureinpicture", handleLeavePiP);
};
/**
 * 全屏
 */
const toggleFullScreenPlay = () => {
  state.fullScreen = toggleFullScreen(refPlayerWrap.value);
};

/**
 * 快捷键控制
 */
// 清空当前操作类型
const clearHandleType = debounce(500, () => {
  state.handleType = "";
});
// 音量 ++ --
const volumeKeydown = (ev) => {
  ev.preventDefault();
  if (ev.code == "ArrowUp") {
    state.volume = state.volume + 0.1 > 1 ? 1 : state.volume + 0.1;
  } else {
    state.volume = state.volume - 0.1 < 0 ? 0 : state.volume - 0.1;
  }
  state.muted = false;
  state.handleType = "volume"; // 操作类型  音量
  clearHandleType(); // 清空 操作类型
};
// 快退
const keydownLeft = (ev) => {
  if (!props.speed) return; // 如果不支持快进快退
  if (videoRef.value) {
    videoRef.value.currentTime =
      videoRef.value.currentTime < 10 ? 0.1 : videoRef.value.currentTime - 10;
  }
  videoEvents.onTimeupdate(videoRef.value);
  playVideo();
};

// 倍数播放
const keypress = (ev) => {
  ev.preventDefault();
  let pressType = ev.type;
  if (ev.key == "ArrowRight" && videoRef.value) {
    playVideo();
    if (pressType == "keyup") {
      clearTimeout(state.longPressTimeout);
      // 如果不支持快进快退 如果关闭快进快退必须在没有长按倍速播放的情况下
      if (!props.speed && !state.longPressTimeout) return;
      if (state.isMultiplesPlay) {
        //如果倍速播放中
        videoRef.value.playbackRate = parseInt(state.speedActive);
        state.isMultiplesPlay = false;
      } else {
        // 触发时间不足500毫秒，进度加10s
        videoRef.value.currentTime = videoRef.value.currentTime + 10;
        videoEvents.onTimeupdate(videoRef.value);
      }
      // 如果长按5倍速播放
    } else if (pressType == "keydown") {
      if (!props.speed) return; // 如果不支持快进快退 也不能支持长按倍速播放
      if (state.isMultiplesPlay) {
        clearTimeout(state.longPressTimeout);
      }
      // 长按5秒后倍速播放
      state.longPressTimeout = setTimeout(() => {
        state.isMultiplesPlay = true;
        videoRef.value ? (videoRef.value.playbackRate = 5) : "";
        state.handleType = "playbackRate"; //操作类型 倍速播放
        clearHandleType(); //清空 操作类型
      }, 500);
    }
  }
};

/**
 * 聚焦到播放器
 */
const inputFocusPlay = () => {
  if (isMobile) return;
  videoRef.value?.focus();
};

let hls;
const init = (): void => {
  if (
    videoRef.value?.canPlayType(props.type) ||
    videoRef.value?.canPlayType("application/vnd.apple.mpegurl") ||
    videoRef.value?.canPlayType("application/x-mpegURL")
  ) {
    state.muted = props.autoPlay;
  }
  // 使用hls解码
  else if (Hlsjs.isSupported()) {
    /**
     * 
      fragLoadingTimeOut：设置片段加载超时时间的配置选项。
      maxBufferLength：设置缓冲区的最大长度，用于控制缓冲视频片段的数量。
      maxBufferSize：设置缓冲区的最大大小，用于控制缓冲视频片段的总大小。
      startLevel：设置初始的质量级别。
      autoStartLoad：设置是否自动开始加载视频。
      enableWorker：启用或禁用Web Worker的使用，用于在后台处理数据。
      enableWebVTT：启用或禁用WebVTT字幕的解析和显示。
      startPosition：设置初始播放位置。
     * 
     */
    hls = new Hlsjs({ fragLoadingTimeOut: 2000 });
    hls.detachMedia(); //解除绑定
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    hls.attachMedia(videoRef.value!);
    // 当媒体元素与Hls实例绑定时触发mediaAttached事件
    hls.on(Hlsjs.Events.MEDIA_ATTACHED, (ev, data) => {
      hls.loadSource(props.src);
      // 设置开始播放的画质级别 (可选)
      hls.startLevel = 0; // 使用默认值
      // 成功解析HLS清单文件后触发manifestParsed事件
      hls.on(Hlsjs.Events.MANIFEST_PARSED, (ev, data) => {
        state.currentLevel = data.firstLevel;
        data.levels.shift();
        state.qualityLevels = data.levels.reverse() || [];
      });
    });

    hls.on(Hlsjs.Events.LEVEL_SWITCHING, (event, data) => {
      // 在LEVEL_SWITCHING事件中执行质量级别切换前的操作
      console.log("LEVEL_SWITCHING");
      // 在此处可以执行一些预处理操作，如暂停视频播放或显示加载指示器
      // state.qualityLevels = Hls.levels || []
      // state.VideoRef.load();
    });

    hls.on(Hlsjs.Events.LEVEL_SWITCHED, (event, data) => {
      // 在LEVEL_SWITCHED事件中执行质量级别切换后的操作
      // 在此处可以执行一些后续操作，如恢复播放或隐藏加载指示器
      state.currentLevel = data.level;
      // state.qualityLevels = Hls.levels || []
      // state.VideoRef.load();
    });

    // 监听错误事件

    hls.on(Hlsjs.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hlsjs.ErrorTypes.NETWORK_ERROR:
            // 尝试重新加载视频源
            console.log("网络错误");

            hls.startLoad(); // 重新加载
            // videoRef.value.load();
            break;
          case Hlsjs.ErrorTypes.MEDIA_ERROR:
            console.log("媒体解码/播放错误");
            hls.recoverMediaError();
            // 如果有必要，可以尝试刷新页面或重启浏览器来清除可能存在的问题
            break;
          default:
          // 其他类型的错误处理
        }
      }
    });
  }
};

// 切换清晰度
const qualityLevelsHandle = (row, index) => {
  hls.currentLevel = index;
  state.currentLevel = index;
  // if (index === -1) {
  //   // 启用自动画质
  //   hls.config.autoStartLoad = true;
  //   hls.config.capLevelToPlayerSize = true;
  //   hls.config.autoLevelEnabled = true;
  // }
};
// 切换播放速度
const playbackRate = (row) => {
  state.speedActive = row;
  videoRef.value.playbackRate = row;
};

onBeforeUnmount(() => {
  if (hls) {
    hls.destroy();
  }
});

watch(
  () => props.src,
  (newVal, oldVal) => {
    nextTick(() => {
      // 初始化
      init();
    });
  },
  { immediate: true }
);

onMounted(() => {
  // 播放器实例
  if (!videoRef.value) {
    console.error("videoRef is null");
    return;
  }
  // 聚焦到播放器
  inputFocusPlay();
});

defineExpose({
  play: playVideo, //播放
  pause: pauseVideo, //暂停
  togglePlay, //暂停或播放
});
</script>

<script lang="ts">
export default {
  name: "videoPlay",
};
</script>
<style lang="scss" scoped>
@import "../assets/style/index.scss";
@import "../assets/style/transition.scss";
@import "../assets/style/animate.scss";

/* width: v-bind(width);
 height: v-bind(height);
 width: $player-width;
   height: $player-height;
   */

.player-wrap {
  // 通过v-bind绑定props中的width和height

  $font-color: v-bind(theme);
}
</style>

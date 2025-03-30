import { Live2dSceneRenderer } from "./renderer";
import { sceneOfPortrait } from "./scenes/portrait";
import { Store } from "@/store";

async function readFileFunction(filePath: string): Promise<ArrayBuffer> {
  if (import.meta.env.VITE_TARGET === "electron") {
    const result = await window.backend.readFile({ filePath });
    if (result.ok) {
      const buf = result.value.buffer;
      return buf as ArrayBuffer;
    }
    return new ArrayBuffer(0);
  } else {
    // for browser mode
    try {
      const res = await fetch(filePath);
      return await res.arrayBuffer();
    } catch (e) {
      window.backend.logError(e);
      return new ArrayBuffer(0);
    }
  }
}

export class Live2dManager {
  canvas: HTMLCanvasElement;
  live2dViewer: unknown;
  isLoadedLive2dCore: boolean;
  isFailedLive2dLoadCore: boolean;
  store: Store;
  live2dSceneRenderer: Live2dSceneRenderer;
  isClicked: boolean;

  constructor(canvas: HTMLCanvasElement, store: Store) {
    this.live2dViewer = undefined;
    this.isLoadedLive2dCore = false;
    this.store = store;
    this.live2dSceneRenderer = new Live2dSceneRenderer();
    this.isClicked = false;
    this.isFailedLive2dLoadCore = false;
    this.canvas = canvas;

    this.onTouchesEventListener = this.onTouches.bind(this);
    this.onTouchEndEventListener = this.onTouchEnd.bind(this);
    this.onTouchMovedEventListener = this.onTouchMoved.bind(this);
  }

  getCanvas() {
    return this.canvas;
  }

  async TouchesBegin(pageX: number, pageY: number) {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    if (!(this.live2dViewer instanceof Live2dViewer)) return;
    this.isClicked = true;

    this.live2dViewer.onTouchesBegin(pageX, pageY);

    const modelKey = this.live2dViewer.getCurrentModelKey();
    const model = this.live2dViewer.getModelFromKey(modelKey);
    const n = Math.floor(Math.random() * 3);
    if (model) {
      model.stopKeepEyeValue();
      switch (n) {
        case 1:
          model.closeEyelids();
          setTimeout(() => model.openEyelids(), 500);
          break;
        case 2: {
          model.keepEyeOpenParams({
            lOpen: 0.8,
            rOpen: 0.8,
          });
          setTimeout(() => model.stopKeepEyeValue(), 1000);
          break;
        }
      }
    }
  }
  onTouches(event: PointerEvent): void {
    void this.TouchesBegin(event.pageX, event.pageY);
  }
  private onTouchesEventListener: (
    this: HTMLCanvasElement,
    event: PointerEvent,
  ) => void;

  async TouchEnd() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    if (!(this.live2dViewer instanceof Live2dViewer)) return;

    this.isClicked = false;
    this.live2dViewer.onTouchesEnded();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTouchEnd(event: PointerEvent) {
    void this.TouchEnd();
  }
  onTouchEndEventListener: (
    this: HTMLCanvasElement,
    event: PointerEvent,
  ) => void;

  async TouchMoved(pageX: number, pageY: number) {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    if (!(this.live2dViewer instanceof Live2dViewer)) return;

    if (this.isClicked) {
      this.live2dViewer.onTouchesMoved(pageX, pageY);
    }
  }
  onTouchMoved(event: PointerEvent) {
    void this.TouchMoved(event.pageX, event.pageY);
  }
  onTouchMovedEventListener: (
    this: HTMLCanvasElement,
    event: PointerEvent,
  ) => void;

  addMouseEventToLive2dCanvas() {
    this.canvas.addEventListener("pointerdown", this.onTouchesEventListener, {
      passive: true,
    });
    this.canvas.addEventListener("pointerup", this.onTouchEndEventListener, {
      passive: true,
    });
    this.canvas.addEventListener("pointerleave", this.onTouchEndEventListener, {
      passive: true,
    });
    this.canvas.addEventListener(
      "pointermove",
      this.onTouchMovedEventListener,
      { passive: true },
    );
  }
  removeMouseEvenet() {
    this.canvas.removeEventListener("pointerdown", this.onTouchesEventListener);
    this.canvas.removeEventListener("pointerup", this.onTouchEndEventListener);
    this.canvas.removeEventListener(
      "pointerleave",
      this.onTouchEndEventListener,
    );
    this.canvas.removeEventListener(
      "pointermove",
      this.onTouchMovedEventListener,
    );
  }

  async setCurrentModelToViewer(key: string) {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;
    if (this.live2dViewer instanceof Live2dViewer) {
      this.live2dViewer.setCurrentModel(key);
    }
  }

  async render() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;
    if (this.live2dViewer instanceof Live2dViewer) {
      this.live2dSceneRenderer.render(this.live2dViewer, sceneOfPortrait);
    }

    return;
  }

  async getTypes() {
    if (this.isFailedLive2dLoadCore) return undefined;

    const { Live2dViewer, Live2dModel, Live2dMotionSyncModel } = await import(
      "live2dmanager"
    )
      .then((m) => {
        return {
          Live2dViewer: m.Live2dViewer,
          Live2dModel: m.Live2dModel,
          Live2dMotionSyncModel: m.Live2dMotionSyncModel,
        };
      })
      .catch((e) => {
        window.backend.logError(e);
        this.isFailedLive2dLoadCore = true;
        return {
          Live2dViewer: undefined,
          Live2dModel: undefined,
          Live2dMotionSyncModel: undefined,
        };
      });

    if (
      Live2dViewer == undefined ||
      Live2dModel == undefined ||
      Live2dMotionSyncModel == undefined
    )
      return undefined;

    return { Live2dViewer, Live2dModel, Live2dMotionSyncModel };
  }

  async initViewer() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;

    try {
      const allocationMemory = 1024 * 1024 * 32;
      this.live2dViewer = new Live2dViewer(this.canvas, 800, 800);
      if (this.live2dViewer instanceof Live2dViewer) {
        this.live2dViewer.initialize(allocationMemory);
      }
      this.isLoadedLive2dCore = true;
      await this.store.dispatch("LIVE2D_CORE_LOADED", { isLive2dLoaded: true });
    } catch (e) {
      window.backend.logError(e);
    }
  }

  getLive2dViewer() {
    if (!this.isLoadedLive2dCore) return undefined;

    return this.live2dViewer;
  }

  async LoadAllModels() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    const Live2dModel = live2dTypes.Live2dModel;
    const Live2dMotionSyncModel = live2dTypes.Live2dMotionSyncModel;

    const live2dViewer = this.live2dViewer;
    const store = this.store;

    if (
      live2dViewer != undefined &&
      live2dViewer instanceof Live2dViewer &&
      Live2dModel != undefined &&
      Live2dMotionSyncModel != undefined
    ) {
      const live2dAssetsPath = await window.backend.getLive2dAssetsPath();
      window.backend.logInfo(`live2dAssetsPath: ${live2dAssetsPath}`);
      // Live2Dモデルをキャラクターに割り当てるにはここだけではなく store/live2d.tsのcanUseLive2dModelArrayも変更すること
      const metan = new Live2dModel(
        live2dAssetsPath + "/四国めたん_vts/",
        "四国めたん.model3.json",
        live2dViewer,
        readFileFunction,
      );
      /*
      await metan.loadAssets();
      metan.setLipSyncWeight(10);
      live2dViewer.addModel("7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff", metan);
      await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
        name: "四国めたん",
        key: "7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff",
      });
      */
      metan
        .loadAssets()
        .then(async () => {
          if (live2dViewer == undefined) return;
          metan.setLipSyncWeight(10);
          live2dViewer.addModel("7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff", metan);
          await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
            name: "四国めたん",
            key: "7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff",
          });
        })
        .catch((e) => {
          window.backend.logError(
            `Error when load metan live2d model assets: ${e}`,
          );
        });

      const zundamon = new Live2dModel(
        live2dAssetsPath + "/Zundamon_vts/",
        "zundamon.model3.json",
        live2dViewer,
        readFileFunction,
      );
      /*
      await zundamon.loadAssets();
      zundamon.setLipSyncWeight(20);
      live2dViewer.addModel("388f246b-8c41-4ac1-8e2d-5d79f3ff56d9", zundamon);
      await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
        name: "ずんだもん",
        key: "388f246b-8c41-4ac1-8e2d-5d79f3ff56d9",
      });
      */
      zundamon
        .loadAssets()
        .then(async () => {
          if (live2dViewer == undefined) return;
          zundamon.setLipSyncWeight(20);
          live2dViewer.addModel(
            "388f246b-8c41-4ac1-8e2d-5d79f3ff56d9",
            zundamon,
          );
          await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
            name: "ずんだもん",
            key: "388f246b-8c41-4ac1-8e2d-5d79f3ff56d9",
          });
        })
        .catch((e) => {
          window.backend.logError(
            `Error when load zundamon live2d model assets: ${e}`,
          );
        });

      const kasukabeTsumugi = new Live2dModel(
        live2dAssetsPath + "/春日部つむぎ公式live2Dモデル/",
        "春日部つむぎ公式live2Dモデル.model3.json",
        live2dViewer,
        readFileFunction,
        true,
      );
      /*
      await kasukabeTsumugi.loadAssets();
      kasukabeTsumugi.setLipSyncWeight(15);
      live2dViewer.addModel(
        "35b2c544-660e-401e-b503-0e14c635303a",
        kasukabeTsumugi,
      );
      await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
        name: "春日部つむぎ",
        key: "35b2c544-660e-401e-b503-0e14c635303a",
      });
      */
      kasukabeTsumugi
        .loadAssets()
        .then(async () => {
          if (live2dViewer == undefined) return;
          kasukabeTsumugi.setLipSyncWeight(15);
          live2dViewer.addModel(
            "35b2c544-660e-401e-b503-0e14c635303a",
            kasukabeTsumugi,
          );
          await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
            name: "春日部つむぎ",
            key: "35b2c544-660e-401e-b503-0e14c635303a",
          });
        })
        .catch((e) => {
          window.backend.logError(
            `Error when load kasukabe tsumugi live2d model assets: ${e}`,
          );
          kasukabeTsumugi.release();
        });

      const kyuusyuuSora = new Live2dModel(
        live2dAssetsPath + "/Sora_vts/",
        "kyuusyuu_sora.model3.json",
        live2dViewer,
        readFileFunction,
      );
      /*
      await kyuusyuuSora.loadAssets();
      kyuusyuuSora.setLipSyncWeight(20);
      live2dViewer.addModel(
        "481fb609-6446-4870-9f46-90c4dd623403",
        kyuusyuuSora,
      );
      await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
        name: "九州そら",
        key: "481fb609-6446-4870-9f46-90c4dd623403",
      });
      */
      kyuusyuuSora
        .loadAssets()
        .then(async () => {
          if (live2dViewer == undefined) return;
          kyuusyuuSora.setLipSyncWeight(20);
          live2dViewer.addModel(
            "481fb609-6446-4870-9f46-90c4dd623403",
            kyuusyuuSora,
          );
          await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
            name: "九州そら",
            key: "481fb609-6446-4870-9f46-90c4dd623403",
          });
        })
        .catch((e) => {
          window.backend.logError(
            `Error when load kyuusyuu sora live2d model assets: ${e}`,
          );
        });

      const chugokuUsagi = new Live2dModel(
        live2dAssetsPath + "/Usagi_vts/",
        "usagi.model3.json",
        live2dViewer,
        readFileFunction,
      );
      /*
      await chugokuUsagi.loadAssets();
      chugokuUsagi.setLipSyncWeight(20);
      chugokuUsagi.setExpression("Inaba");
      live2dViewer.addModel(
        "1f18ffc3-47ea-4ce0-9829-0576d03a7ec8",
        chugokuUsagi,
      );
      await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
        name: "中国うさぎ",
        key: "1f18ffc3-47ea-4ce0-9829-0576d03a7ec8",
      });
      */
      chugokuUsagi
        .loadAssets()
        .then(async () => {
          if (live2dViewer == undefined) return;
          chugokuUsagi.setLipSyncWeight(20);
          chugokuUsagi.setExpression("Inaba");
          live2dViewer.addModel(
            "1f18ffc3-47ea-4ce0-9829-0576d03a7ec8",
            chugokuUsagi,
          );
          await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
            name: "中国うさぎ",
            key: "1f18ffc3-47ea-4ce0-9829-0576d03a7ec8",
          });
        })
        .catch((e) => {
          window.backend.logError(
            `Error when load chudoku usagi live2d model assets: ${e}`,
          );
        });

      // モーションが動作するか検証するためにLive2dのサンプルモデルを使用。便宜上雨晴はうに。
      const hau = new Live2dModel(
        live2dAssetsPath + "/Mao/",
        "Mao.model3.json",
        live2dViewer,
        readFileFunction,
      );
      /*
      await hau.loadAssets();
      hau.setLipSyncWeight(10);
      live2dViewer.addModel("3474ee95-c274-47f9-aa1a-8322163d96f1", hau);
      await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
        name: "雨晴はう",
        key: "3474ee95-c274-47f9-aa1a-8322163d96f1",
      });
      */
      hau
        .loadAssets()
        .then(async () => {
          if (live2dViewer == undefined) return;
          hau.setLipSyncWeight(10);
          live2dViewer.addModel("3474ee95-c274-47f9-aa1a-8322163d96f1", hau);
          await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
            name: "雨晴はう",
            key: "3474ee95-c274-47f9-aa1a-8322163d96f1",
          });
        })
        .catch((e) => {
          window.backend.logError(
            `Error when load hau live2d model assets: ${e}`,
          );
        });

      // Motion Sync サンプル。波音リツに割り当てているのは雨晴はうの時と同様の理由。
      const kei = new Live2dMotionSyncModel(
        live2dAssetsPath + "/Kei_basic/",
        "Kei_basic.model3.json",
        live2dViewer,
        readFileFunction,
      );
      /*
      await kei.loadAssets();
      live2dViewer.addModel("b1a81618-b27b-40d2-b0ea-27a9ad408c4b", kei);
      await store.actions.ADDED_LIVE2D_MODEL_RECORD({
        name: "波音リツ",
        key: "b1a81618-b27b-40d2-b0ea-27a9ad408c4b",
      });
      */
      kei
        .loadAssets()
        .then(async () => {
          if (live2dViewer == undefined) return;
          live2dViewer.addModel("b1a81618-b27b-40d2-b0ea-27a9ad408c4b", kei);
          await store.actions.ADDED_LIVE2D_MODEL_RECORD({
            name: "波音リツ",
            key: "b1a81618-b27b-40d2-b0ea-27a9ad408c4b",
          });
        })
        .catch((e) => {
          window.backend.logError(e);
        });

      live2dViewer.setCurrentModel("7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff");
      await store.dispatch("LIVE2D_INITIALIZED", { isLive2dInitialized: true });
    }
  }

  async releaseLive2d() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;

    if (
      this.live2dViewer != undefined &&
      this.live2dViewer instanceof Live2dViewer
    ) {
      this.live2dSceneRenderer.cancelRender();
      this.live2dViewer.release();
      await this.store.dispatch("LIVE2D_INITIALIZED", {
        isLive2dInitialized: false,
      });
    }
  }

  async stopLipSync() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;
    const live2dViewer = this.live2dViewer;

    if (live2dViewer instanceof Live2dViewer) {
      const m = live2dViewer.getModelFromKey(live2dViewer.getCurrentModelKey());
      if (m == undefined) {
        return;
      }

      const Live2dMotionSyncModel = live2dTypes.Live2dMotionSyncModel;
      if (m instanceof Live2dMotionSyncModel) {
        m.stopMotionSync();
      } else {
        m.stopLipSync();
      }
    }
  }
}

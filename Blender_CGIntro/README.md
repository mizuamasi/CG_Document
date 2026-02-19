# Blender_CGIntro

**1時間で「Blenderの操作」と「CG基礎概念」を結びつける講義資料（読み物兼トークスクリプト）**

- 対象: CG/Blender初学者
- ゴール: `形状（Mesh）→ 見た目（Material）→ 見え方（Light/Render）` の因果を一本で理解する
- 形式: GitHub Markdown（そのまま公開・閲覧可）

---

## 使い方（講師向け）

- 各トピックは **1枚フォーマット** に統一しています。
  - 概念1行
  - Blender上の操作名
  - よくある失敗
  - 話すポイント（口頭メモ）
- 進行は60分想定。詰まったら後半を短縮し、**法線・Roughness・ライト種**だけは必ず回収。

---

## 0. 導入（3分）

### 概念1行
CGは「形を作る → 材質を決める → 光を当てる → 画像にする」の処理パイプライン。

### Blender操作名
- Mesh
- Material (Shader)
- Light
- Render

### よくある失敗
- いきなり見た目調整に入り、何が効いているか分からなくなる

### 話すポイント
- 今日の講義は「全部」ではなく、**因果の幹**だけつかむ。
- キーワードはこの7つ: `頂点/辺/面` `法線` `UV` `Normal Map` `Roughness/Metallic` `Light種` `Eevee/Cycles`。

---

## 1. 点・線・面：メッシュの最小単位（10分）

### 概念1行
すべてのモデリング操作は、結局「面の追加と再配置」。

### Blender操作名
- Edit Mode
- Extrude
- Loop Cut
- Bevel

### よくある失敗
- N-gonだらけで後工程（シェーディング・変形）で破綻
- Scale未適用で他設定と噛み合わない

### 話すポイント
- 「カッコいい形を作る」より前に、**何が増減しているか（頂点/辺/面）**を追う。
- 面の種類（三角形/四角形/N-gon）で後工程の安定性が変わる。

### 参考画像
![Mesh structure example](https://docs.blender.org/manual/en/latest/_images/modeling_meshes_structure_cube-example.png)

---

## 2. “形がある”ように見える理由：法線とスムージング（12分）

### 概念1行
見た目の丸さ/硬さは、形状そのものだけでなく「法線の扱い」で決まる。

### Blender操作名
- Shade Smooth / Shade Flat
- Auto Smooth
- Recalculate Normals

### よくある失敗
- 法線反転に気づかず、暗くなる/破綻する
- ポリゴンを増やさないと角が立たないと思い込む

### 話すポイント
- 法線は「光の計算基準の向き」。
- Auto Smoothは**角度しきい値**でスムーズ/シャープを分ける実用機能。
- 「ローポリなのに丸く見える」理由をここで腹落ちさせる。

---

## 3. UVとテクスチャ：2D画像を3Dに貼る（10分）

### 概念1行
UVは3D表面に2D座標を与える辞書。

### Blender操作名
- Mark Seam
- Unwrap
- UV Editorで島を調整

### よくある失敗
- Seam設計なしでUnwrapして歪みが大きくなる
- テクスチャ密度（Texel Density）を揃えず、部位ごとに粗さが変わる

### 話すポイント
- UVは「貼るための前処理」。
- ここで「テクスチャは色だけじゃない」という伏線を張る（次章へ接続）。

---

## 4. ノーマルマップ：凹凸“っぽさ”を偽造する（8分）

### 概念1行
ノーマルマップは形状を増やさず、法線だけ細かく変えて凹凸感を作る。

### Blender操作名
- Image Texture（Color Space: Non-Color）
- Normal Map Node
- Principled BSDF の Normal へ接続

### よくある失敗
- Normal MapをsRGBのまま使う
- 凹凸方向（OpenGL/DirectX差）で逆向きになる

### 話すポイント
- 「重くしないディテール」の基本。
- 実務ではタンジェント空間ノーマルが主流。

---

## 5. PBR基本：Roughness / Metallicが主戦場（12分）

### 概念1行
PBRは材質パラメータで光の反応を一貫して扱う考え方。

### Blender操作名
- Principled BSDF
  - Base Color
  - Metallic
  - Roughness

### よくある失敗
- Metallicを中途半端な値で乱用
- Roughnessを触らず「質感が出ない」と悩む

### 話すポイント
- 初心者はまず `Roughness` から触ると差が見えやすい。
- PBRの最低限は `Base Color / Metallic / Roughness`。
- glTF 2.0 のmetal-roughnessモデルとも整合する。

### 参考画像
![Principled BSDF node](https://docs.blender.org/manual/en/latest/_images/node-types_ShaderNodeBsdfPrincipled.webp)

---

## 6. ライティング種類：ライトは影の質を作る（10分）

### 概念1行
ライトは「明るさ」だけでなく「影の境界の性質」を決める。

### Blender操作名
- Point
- Sun
- Spot
- Area

### よくある失敗
- Area Lightのサイズを変えず、影の硬さが調整できない
- とりあえずライトを増やして破綻する

### 話すポイント
- Point=電球 / Sun=平行光 / Spot=懐中電灯 / Area=面光源。
- まずは主光・補助・逆光の3点で作る。

### 参考画像
![Light terms](https://docs.blender.org/manual/en/latest/_images/render_lights_light-object_terms.png)

---

## 7. レンダリング超入門：Eevee vs Cycles（5分）

### 概念1行
EeveeとCyclesは優劣ではなく、目的（速度か物理整合か）が違う。

### Blender操作名
- Render Engine: Eevee / Cycles
- Sample / Denoise（必要最小限）

### よくある失敗
- 設定沼に入り、学習の主目的を見失う

### 話すポイント
- 授業では「仕上がり比較」を見せるだけで十分。
- 設定詳細（バウンス/パス）は次回以降。

---

## 時間配分サマリ（60分）

- 0. 導入: 3分
- 1. 点線面（メッシュ）: 10分
- 2. 法線とスムージング: 12分
- 3. UV: 10分
- 4. ノーマルマップ: 8分
- 5. PBR基礎: 12分
- 6. ライト種: 10分
- 7. Eevee/Cycles: 5分

> ※実運用では質疑が入るため、章4〜7を合計10分短縮できるよう準備しておくのがおすすめ。

---

## 1時間で切るべきトピック（優先度低）

- トポロジー美学の深掘り
- ベイク
- HDRI
- カラーマネジメント詳細
- レンダーパス
- ジオメトリノード

**理由**: 初回理解の主因果（点線面→法線→UV→Normal Map→PBR→Light→Render）を進める効果が薄い。

---

## 講義スライド化しやすいテンプレ（コピペ用）

```md
## トピック名（時間）
### 概念1行
...

### Blender操作名
- ...

### よくある失敗
- ...

### 話すポイント
- ...
```

---

## 参考リンク

1. Mesh Structure (Blender Manual): https://docs.blender.org/manual/en/latest/modeling/meshes/structure.html
2. Shade Smooth: https://docs.blender.org/manual/en/2.91/scene_layout/object/editing/shading.html
3. Shading / Auto Smooth (JA): https://docs.blender.org/manual/ja/latest/scene_layout/object/editing/shading.html
4. UV Unwrapping Intro: https://docs.blender.org/manual/en/4.0/modeling/meshes/uv/unwrapping/introduction.html
5. Normal Map Node: https://docs.blender.org/manual/en/4.0/render/shader_nodes/vector/normal_map.html
6. Normal Map Node (JA): https://docs.blender.org/manual/ja/4.1/render/shader_nodes/vector/normal_map.html
7. Principled BSDF: https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/principled.html
8. glTF 2.0 (LoC): https://www.loc.gov/preservation/digital/formats/fdd/fdd000500.shtml
9. Disney BRDF notes: https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf
10. Light Objects: https://docs.blender.org/manual/en/latest/render/lights/light_object.html

---

## 画像クレジット

- Mesh image URL: Blender Manual (`modeling_meshes_structure_cube-example.png`)
- Principled BSDF image URL: Blender Manual (`node-types_ShaderNodeBsdfPrincipled.webp`)
- Light terms image URL: Blender Manual (`render_lights_light-object_terms.png`)

---

## GitHub Pages での公開メモ（最短）

1. このリポジトリの `Settings > Pages` を開く
2. Source を `Deploy from a branch` に設定
3. Branch を `work`（または `main`） / Folder を `/ (root)` に設定
4. 数分後に発行されるURLで `Blender_CGIntro/README.md` を確認

> 補足: スライド的に見せる場合は、後で `Blender_CGIntro/index.md` を作り、章ごとに分割してリンクすると運用しやすいです。

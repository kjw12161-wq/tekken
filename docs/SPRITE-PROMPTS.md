# 스프라이트 시트 생성 프롬프트 키트

이미지 생성 AI로 이 게임에 바로 쓸 수 있는 스프라이트를 만들기 위한 프롬프트 모음입니다.
**프레임 키·규격이 게임과 1:1로 맞춰져 있어**, 생성한 이미지를 `tools/pack-sprites.html` 에
넣으면 시트와 `sprites.json` 이 자동으로 만들어집니다.

> 저작권 안내: 원작 게임에서 추출한 스프라이트는 재배포할 수 없습니다.
> 직접 생성했거나 사용 권리를 가진 이미지만 저장소에 넣으세요.

---

## 0. 작업 순서

1. **스타일 고정** — 아래 `idle0` 프롬프트로 한 장을 먼저 만들고, 마음에 드는 결과가 나오면
   그 이미지를 레퍼런스로 물려서(image-to-image / 캐릭터 일관성 기능) 나머지 프레임을 생성합니다.
2. **프레임당 한 장** — 파일 이름을 **프레임 키 그대로** 저장합니다. 예: `idle0.png`, `straight4.png`, `beamF.png`
   (`goku_idle0.png` 처럼 앞에 캐릭터 이름이 붙어도 인식합니다.)
3. **조립** — `tools/pack-sprites.html` 을 열고 이미지를 드래그하면
   내장 스프라이트를 반투명 가이드로 깔아 주고, 크기·위치를 자동 정렬해 시트를 만들어 줍니다.
4. **적용** — 내려받은 `<캐릭터>.png` 와 `sprites.json` 을 `assets/` 에 넣으면 끝입니다.

### 최소 세트부터 시작해도 됩니다
등록하지 않은 프레임은 자동으로 내장 스프라이트가 쓰이므로, 아래 **20장**만 만들어도 게임이 돌아갑니다.

```
idle0 idle1 idle2 idle3          (대기 - 가장 오래 보이므로 최우선)
walk0 walk2 walk4                (전진)
guard crouch jumpUp jumpDown hurt down
jab4 straight4 roundhouse4 uppercut4 sweep4   (기술의 결정적 순간)
kiBlast4 beamC3 beamF            (기공파)
```

---

## 1. 공통 프롬프트 블록 (모든 프레임 앞에 붙입니다)

```
2D pixel art fighting game sprite, single character, Akira Toriyama Dragon Ball art style.
Side view, character faces RIGHT.
Clean 1px dark outline (outline color tinted to each material, not pure black).
Cel shading with 3-4 tones per material (base / shadow / highlight), light from above, no dithering.
Sharp pixel edges, no anti-aliasing, no blur.
Transparent background, character only.
Full body visible from head to feet, feet flat on an invisible ground line near the bottom.
Consistent character height and head size across all frames.
```

### 금지 항목 (negative prompt)
```
background, ground shadow, energy effects, aura, beam, ki blast sphere, motion blur,
text, labels, watermark, frame border, multiple characters, cropped limbs,
3d render, realistic, painterly, gradient background, anti-aliased soft edges
```

> **이펙트는 그리지 마세요.** 기 구체·빔·오라·잔상은 게임이 실시간으로 그립니다.
> 손 모양(내민 손바닥, 모은 두 손)만 정확하면 됩니다.
> **바닥 그림자도 그리지 마세요.** 게임이 따로 그립니다.

---

## 2. 캐릭터 블록 (공통 블록 뒤에 하나를 골라 붙입니다)

| 캐릭터 | 프롬프트 |
|---|---|
| 손오공 | `Goku: spiky black hair, orange gi with blue undershirt, blue sash belt, blue wristbands, bare forearms, dark blue boots with orange trim.` |
| 초사이어인 손오공 | `Super Saiyan Goku: golden spiky upswept hair, green eyes, orange gi with blue undershirt, blue wristbands, dark blue boots.` |
| 베지터 | `Vegeta: flame-shaped black hair with widow's peak, navy blue battle suit, white saiyan armor chest plate with gold shoulder pads, white gloves, white boots.` |
| 피콜로 | `Piccolo: green skin, pointed ears, antennae, purple gi with dark blue sash, white turban and cape, brown boots.` |
| 프리저 | `Frieza final form: white and purple bio-armor, smooth white head with purple crown, red eyes, purple gems on shoulders and chest, slender build.` |
| 셀 | `Perfect Cell: green insectoid humanoid, black spots, dark green wing shells on back, black head crest and antennae, orange eyes.` |
| 얼티밋 오반 | `Ultimate Gohan: spiky black hair swept back, navy blue Supreme Kai gi, light blue long-sleeved undershirt, red sash, light boots.` |
| 트랭크스 | `Future Trunks: lavender bob hair, dark blue jacket over grey shirt, yellow belt, sword on back, yellow boots.` |

초사이어인 변형이 필요한 캐릭터(손오공·베지터·트랭크스)는 같은 프레임을 금발로 한 번 더 만들고
파일 이름 뒤에 `_ss` 를 붙입니다. 예: `straight4_ss.png`

---

## 3. 프레임별 포즈 지시문 (총 88장)

숫자가 붙은 기술 프레임은 **0 = 준비 자세, 4 = 기술이 완전히 뻗은 순간**입니다.
후딜은 게임이 같은 프레임을 역순으로 재생하므로 따로 만들지 않습니다.

### 대기 `idle0` ~ `idle3` — 4프레임 호흡 루프
| 키 | 포즈 |
|---|---|
| `idle0` | 파이팅 스탠스. 발을 어깨보다 넓게 벌리고 무릎을 살짝 굽힘. 두 주먹을 가슴 높이로 올려 팔꿈치는 몸 바깥. |
| `idle1` | `idle0` 에서 숨을 들이쉬어 가슴과 어깨가 살짝 올라간 상태. |
| `idle2` | 호흡의 최고점. 어깨가 가장 올라가고 주먹도 조금 위. |
| `idle3` | 내려오는 중간 단계. |

### 전진 `walk0` ~ `walk5` / 후진 `back0` ~ `back5`
| 키 | 포즈 |
|---|---|
| `walk0` | 앞발을 내딛기 시작, 뒷발 뒤꿈치가 들림. 가드는 유지. |
| `walk1` | 앞발이 착지하기 직전, 몸이 가장 낮음. |
| `walk2` | 앞발 착지, 체중이 앞으로 실림. |
| `walk3` | 뒷발이 앞으로 나오기 시작. |
| `walk4` | 두 발이 교차하며 몸이 가장 높음. |
| `walk5` | 반대쪽 발을 내딛기 시작. |
| `back0`~`back5` | 같은 6단계를 **뒤로 물러나는** 동작으로. 상체는 상대를 향한 채 보폭만 작게. |

### 기 모으기 `charge0` ~ `charge3`
두 주먹을 허리 옆에 붙이고 무릎을 굽혀 버티며 온몸에 힘을 준 자세.
4프레임에 걸쳐 몸이 아주 미세하게 떨리고 상체가 오르내립니다.

### 승리 `win0` ~ `win3`
한 팔을 하늘로 들어 올린 승리 포즈. 4프레임 호흡 루프.

### 기본 자세
| 키 | 포즈 |
|---|---|
| `crouch` | 깊게 앉은 자세. 무릎을 접고 상체를 낮춤, 주먹은 가슴 앞. |
| `crouchGuard` | 앉은 채 두 팔을 얼굴 앞에 세워 막는 자세. |
| `guard` | 서서 두 팔을 얼굴과 가슴 앞에 세워 막는 자세. 상체가 살짝 뒤로. |
| `dash` | 앞으로 급가속. 상체를 크게 숙이고 두 팔은 뒤로 흘림. |
| `wakeup` | 쓰러졌다 일어나는 중간. 한쪽 무릎을 세우고 손으로 바닥을 짚음. |
| `down` | 바닥에 등을 대고 쓰러진 자세. 머리는 뒤쪽, 다리는 앞쪽. 눈은 X 자. |
| `jumpUp` | 상승 중. 무릎을 접어 올리고 두 팔은 위로. |
| `jumpDown` | 하강 중. 다리를 아래로 뻗고 팔은 내림. |
| `hurt` | 맞은 순간. 고개가 뒤로 젖혀지고 상체가 뒤로 밀리며 두 팔이 벌어짐. |

### 타격기 (각 5프레임)
| 기술 | 0 준비 | 4 완전히 뻗음 |
|---|---|---|
| `jab0`~`jab4` | 앞손을 살짝 당김 | 앞손 잽이 어깨 높이로 곧게 뻗고 어깨가 따라 나감 |
| `straight0`~`straight4` | 뒤로 체중을 실으며 주먹을 당김 | 허리와 어깨를 크게 돌린 강펀치, 뒷발 뒤꿈치가 들림 |
| `roundhouse0`~`roundhouse4` | 무릎을 들어 올림 | 다리가 수평으로 완전히 뻗고 상체가 뒤로 기움 |
| `lowKick0`~`lowKick4` | 앉은 자세에서 무릎을 당김 | 앞으로 짧고 낮게 뻗은 발차기 |
| `sweep0`~`sweep4` | 몸을 크게 낮춤 | 다리를 바닥에 붙여 크게 쓸어내는 자세 |
| `uppercut0`~`uppercut4` | 무릎을 굽혀 몸을 낮춤 | 주먹을 머리 위로 뻗어 올리며 몸이 떠오름(발끝이 지면에서 살짝 뜸) |
| `grab0`~`grab4` | 두 팔을 가슴 앞에 모음 | 두 팔을 앞으로 크게 뻗어 붙잡는 자세, 손가락을 폄 |
| `airPunch0`~`airPunch4` | 공중, 다리를 접고 주먹을 당김 | 공중에서 앞손을 아래앞으로 내지름 |
| `airKick0`~`airKick4` | 공중, 무릎을 당김 | 공중에서 앞다리를 아래앞으로 뻗어 참 |

### 기공파
| 키 | 포즈 |
|---|---|
| `kiBlast0`~`kiBlast4` | 한 손을 앞으로 내미는 4단계. 4에서 손바닥이 정면을 향해 완전히 뻗음. **에너지 구체는 그리지 않음.** |
| `beamC0`~`beamC3` | 두 손을 허리 옆(뒤쪽)으로 모으는 4단계. 3이 완전히 모은 자세(카메하메파 준비). 몸을 옆으로 틀고 무릎을 굽힘. |
| `beamF` | 두 손을 앞으로 내밀어 빔을 쏘는 자세. 앞뒤로 다리를 크게 벌려 버팀. **빔은 그리지 않음.** |

---

## 4. 완성 프롬프트 예시

```
2D pixel art fighting game sprite, single character, Akira Toriyama Dragon Ball art style.
Side view, character faces RIGHT.
Clean 1px dark outline (outline color tinted to each material, not pure black).
Cel shading with 3-4 tones per material (base / shadow / highlight), light from above, no dithering.
Sharp pixel edges, no anti-aliasing, no blur.
Transparent background, character only.
Full body visible from head to feet, feet flat on an invisible ground line near the bottom.
Consistent character height and head size across all frames.

Goku: spiky black hair, orange gi with blue undershirt, blue sash belt, blue wristbands,
bare forearms, dark blue boots with orange trim.

POSE: heavy straight punch fully extended - hips and shoulders rotated into the punch,
front arm completely straight at shoulder height, rear heel lifted off the ground,
rear fist pulled back at the chest.
```
(마지막 `POSE:` 줄만 위 표의 지시문으로 바꿔 가며 88장을 만듭니다.)

---

## 5. 규격 요약

| 항목 | 값 |
|---|---|
| 셀 크기 | 136 × 168 px |
| 발끝(원점) | 셀 안에서 (50, 154) |
| 스케일 | 0.75 (스프라이트 1px = 월드 1.333단위) |
| 캐릭터 키 | 발끝~정수리 약 105px, 머리카락 포함 최대 130px |
| 바라보는 방향 | 오른쪽 |
| 배경 | 투명 |

원본은 크게(예: 512×640) 만들고 `tools/pack-sprites.html` 에서 축소·정렬하면 됩니다.
프레임 키 전체 목록과 시트 JSON 형식은 [`assets/README.md`](../assets/README.md) 를 참고하세요.

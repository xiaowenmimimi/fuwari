# 🍥 Fuwari (Customized Version)

![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)

📖 README:[English](./README.en.md) | [简体中文](../README.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Indonesia](./README.id.md) | [한국어](./README.ko.md) | [ภาษาไทย](./README.th.md) | [Tiếng Việt](./README.vi.md)

[Astro](https://astro.build)로 구축된 정적 블로그 템플릿 [Fuwari](https://github.com/saicaca/fuwari)의 커스터마이즈 버전입니다.

원본의 부드러운 애니메이션과 깔끔한 디자인을 유지하면서, **Bangumi 애니메이션 추적**, **Waline 댓글**, **Umami 통계** 등 실용적인 기능을 통합했습니다. 동시에 **UI 디테일**도 깊이 있게 최적화되었습니다.

[**🖥️ 내 블로그 미리보기**](https://blog.xhwen.cn)

## ✨ 새로운 기능

원본 Fuwari와 비교하여, 이 프로젝트는 주로 다음 기능들을 추가했습니다:

- 📺 **Bangumi 애니메이션 추적 페이지**
  - Bangumi API 통합, 시청 진행 상황 자동 표시.
  - 애니메이션 필터링 및 페이지네이션 지원.
  - 상세 페이지에서 애니메이션 커버, 평점, 요약 등의 정보 표시.

- 💬 **Waline 댓글 시스템**
  - Waline 댓글 컴포넌트 내장, 게시물 페이지에서의 댓글 상호작용 지원.
  - 다크 모드 자동 적응 지원.
  - `src/config.ts`에서 서버 주소를 유연하게 구성 가능.

- 📊 **Umami 통계 통합**
  - Umami 통계 스크립트 내장, HTML을 수동으로 수정할 필요 없음.
  - 페이지 PV/UV 통계 표시 지원.
  - 라우팅 전환 시 통계 보고 자동 처리 (Swup 호환).

## 🛠️ 구성 가이드

이 프로젝트의 모든 구성 항목은 `src/config.ts` 파일에 위치하며 상세한 주석 설명이 포함되어 있습니다.

## 📝 Markdown 확장 구문

Astro가 기본적으로 지원하는 Markdown 구문 외에도, 이 프로젝트는 링크 카드 `::link-card` 컴포넌트를 확장했습니다.

**구문:**

```markdown
::link-card{title="제목" url="링크 주소" desc="설명(선택)" image="이미지 링크(선택)" badge="배지(선택)" target="여는 방식 (`_blank`, `_self`, 기본값 `_blank`)(선택)"}
```

## 🚀 로컬 실행

1. 저장소 복제:
   ```bash
   git clone https://github.com/xiaowenmimimi/fuwari.git
   cd fuwari
   ```

2. 의존성 설치:
   ```bash
   pnpm install
   ```

3. 개발 서버 시작:
   ```bash
   pnpm dev
   ```

4. 프로덕션 버전 빌드:
   ```bash
   pnpm build
   ```

## ⚡ 일반적인 명령어

| 명령어 | 설명 |
|:---|:---|
| `pnpm install` | 의존성 설치 |
| `pnpm dev` | 로컬 개발 서버 시작 (`localhost:4321`) |
| `pnpm build` | 프로덕션 사이트를 `./dist/`로 빌드 |
| `pnpm preview` | 빌드 결과물 미리보기 |
| `pnpm new-post <filename>` | 새 게시물 작성 |

## 🤝 감사의 말

- 원본 테마 작성자: [Saicaca/fuwari](https://github.com/saicaca/fuwari)
- Bangumi 기능 참조: [Kasuha](https://kasuha.com/posts/fuwari-enhance-ep2/)

## 📄 라이선스

이 프로젝트는 [MIT License](./LICENSE) 오픈 소스 프로토콜을 따릅니다. 자세한 내용은 LICENSE 파일을 참조하세요.

[saicaca/fuwari](https://github.com/saicaca/fuwari)에서 포크되었습니다. 원작자에게 감사드립니다.

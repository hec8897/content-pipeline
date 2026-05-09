import type { ActivityEvent, CardNewsCard, Content, InterviewQA, QueueItem } from './types';

export const LIBRARY_ITEMS: Content[] = [
  {
    id: 'p1',
    title: '5살 푸들 입양한 지 한 달, 1인 가구가 알게 된 7가지',
    topic: '강아지 입양 후기',
    thumb: '#1a1a2e',
    thumbFg: 'white',
    thumbText: '성견 입양\n한 달',
    state: 'live',
    channels: ['naver', 'insta'],
    publishedAt: '2026.05.07',
    views: 1284,
    likes: 96,
  },
  {
    id: 'p2',
    title: '재택근무 책상 셋업 완성 — 1년의 시행착오',
    topic: '재택 책상 셋업',
    thumb: '#0a3d2c',
    thumbFg: 'white',
    thumbText: '재택 책상\n셋업',
    state: 'live',
    channels: ['naver', 'insta'],
    publishedAt: '2026.05.05',
    views: 822,
    likes: 54,
  },
  {
    id: 'p3',
    title: '20대 후반 첫 적금, 어떻게 시작할까?',
    topic: '20대 첫 적금',
    thumb: '#5b5bd6',
    thumbFg: 'white',
    thumbText: '첫\n적금',
    state: 'scheduled',
    channels: ['naver', 'insta'],
    publishedAt: '2026.05.10 09:00',
    views: 0,
    likes: 0,
  },
  {
    id: 'p4',
    title: '저속노화 식단 한 달, 진짜 효과 있을까?',
    topic: '저속노화 식단',
    thumb: '#c87f0a',
    thumbFg: 'white',
    thumbText: '저속노화\n식단',
    state: 'draft',
    channels: [],
    publishedAt: '—',
    views: 0,
    likes: 0,
  },
  {
    id: 'p5',
    title: '1인 가구 산책 루틴, 지속 가능하게 짜기',
    topic: '산책 루틴',
    thumb: '#f6f5f1',
    thumbFg: '#222',
    thumbText: '산책\n루틴',
    state: 'processing',
    channels: ['naver'],
    publishedAt: '2026.05.07 14:32',
    views: 0,
    likes: 0,
  },
  {
    id: 'p6',
    title: '에어컨 셀프 청소, 의외로 30분이면 끝',
    topic: '에어컨 청소',
    thumb: '#222',
    thumbFg: 'white',
    thumbText: '에어컨\n청소',
    state: 'live',
    channels: ['naver'],
    publishedAt: '2026.04.30',
    views: 412,
    likes: 31,
  },
  {
    id: 'p7',
    title: '성견 사료 바꿀 때 꼭 챙길 3가지',
    topic: '사료 변경',
    thumb: '#0a3d2c',
    thumbFg: 'white',
    thumbText: '사료\n변경',
    state: 'failed',
    channels: ['insta'],
    publishedAt: '2026.05.06 18:11',
    views: 0,
    likes: 0,
  },
  {
    id: 'p8',
    title: '분리불안, 일주일이면 잡힐 수 있을까?',
    topic: '분리불안 완화',
    thumb: '#5b5bd6',
    thumbFg: 'white',
    thumbText: '분리\n불안',
    state: 'live',
    channels: ['naver', 'insta'],
    publishedAt: '2026.04.28',
    views: 1801,
    likes: 142,
  },
];

export const QUEUE_ITEMS: QueueItem[] = [
  {
    id: 'q1',
    contentTitle: '1인 가구 산책 루틴, 지속 가능하게 짜기',
    channel: 'naver',
    state: 'processing',
    startedAt: '방금 전',
    note: 'n8n smtp 전송 중',
    attempt: 1,
  },
  {
    id: 'q2',
    contentTitle: '1인 가구 산책 루틴, 지속 가능하게 짜기',
    channel: 'insta',
    state: 'pending',
    startedAt: '—',
    note: 'naver 완료 후 시작',
    attempt: 0,
  },
  {
    id: 'q3',
    contentTitle: '20대 후반 첫 적금, 어떻게 시작할까?',
    channel: 'naver',
    state: 'scheduled',
    startedAt: '2026.05.10 09:00',
    note: '예약 발행 (3일 뒤)',
    attempt: 0,
  },
  {
    id: 'q4',
    contentTitle: '20대 후반 첫 적금, 어떻게 시작할까?',
    channel: 'insta',
    state: 'scheduled',
    startedAt: '2026.05.10 09:00',
    note: '예약 발행 (3일 뒤)',
    attempt: 0,
  },
  {
    id: 'q5',
    contentTitle: '성견 사료 바꿀 때 꼭 챙길 3가지',
    channel: 'insta',
    state: 'failed',
    startedAt: '1시간 전',
    note: 'Graph API: 미디어 컨테이너 생성 실패 (오류 24)',
    attempt: 2,
  },
];

export const INTERVIEW_QUESTIONS: InterviewQA[] = [
  {
    q: '어떤 종이에요? 입양 전에 가장 오래 고민했던 부분은 무엇이었나요?',
    placeholder: '예: 푸들이고요, 분리불안 때문에 고민이 많았어요…',
    a: "5살 푸들 입양했어요. 분리불안 때문에 고민이 진짜 많았는데, 결국은 '같이 시간 맞춰 살자'는 마음으로 결정했어요.",
  },
  {
    q: '입양 첫날, 가장 의외였던 순간을 한 장면으로 떠올린다면요?',
    placeholder: '장면, 표정, 소리, 냄새… 무엇이든 좋아요',
    a: '거실 한가운데 앉아서 30분 동안 저만 빤히 쳐다보던 순간이요. 무슨 생각을 하는지 모르겠는데 그게 너무 짠했어요.',
  },
  {
    q: '지금 가장 자주 검색하는 주제는 어떤 건가요?',
    placeholder: '사료, 행동 교정, 산책 코스, 동물병원 등',
    a: '5살 입양견 적응 기간, 분리불안 완화, 그리고 사료 추천이요.',
  },
  {
    q: '이 글을 읽었으면 하는 사람은 어떤 상황에 있는 사람일까요?',
    placeholder: '독자의 고민이나 상황을 떠올려보세요',
    a: '성견 입양을 고민하고 있는 1인 가구. 강아지는 키우고 싶은데 어린 강아지 키울 자신은 없는 사람.',
  },
  {
    q: '이 경험을 통해 독자가 가져갔으면 하는 한 문장이 있다면요?',
    placeholder: '본인이 깨달은 것, 알려주고 싶은 것',
    a: "성견 입양은 '키우는' 것보다 '함께 적응해가는' 일에 가깝다는 것.",
  },
];

export const CARD_NEWS: CardNewsCard[] = [
  {
    id: 'c1',
    type: 'cover',
    title: '성견 입양 한 달,\n알게 된 것들',
    subtitle: '5살 푸들과 1인 가구의 적응기',
    tag: '@minji.daily',
    bg: '#1a1a2e',
    fg: 'white',
  },
  {
    id: 'c2',
    type: 'body',
    num: '01',
    title: '어린 강아지가 아니어도\n괜찮을까?',
    body: "분리불안이 가장 큰 걱정이었어요.\n하지만 정답은 '시간을 맞추는 것'이었습니다.",
    bg: '#0a3d2c',
    fg: 'white',
  },
  {
    id: 'c3',
    type: 'body',
    num: '02',
    title: '첫날의 30분,\n빤히 쳐다보던 순간',
    body: '무슨 생각을 하는지 모를\n그 짠한 눈빛이 모든 것의 시작이었어요.',
    bg: '#5b5bd6',
    fg: 'white',
  },
  {
    id: 'c4',
    type: 'body',
    num: '03',
    title: '성견의 적응 기간은\n생각보다 길어요',
    body: '보통 2주~3개월.\n조급해하지 않는 게 가장 중요해요.',
    bg: '#c87f0a',
    fg: 'white',
  },
  {
    id: 'c5',
    type: 'body',
    num: '04',
    title: '사료 바꿀 때\n주의할 점 3가지',
    body: '1. 7~10일에 걸쳐 천천히\n2. 변 상태 매일 체크\n3. 알러지 의심 시 단백질 변경',
    bg: '#222',
    fg: 'white',
  },
  {
    id: 'c6',
    type: 'body',
    num: '05',
    title: '분리불안 완화\n실제로 효과 본 것',
    body: '외출 전 의식 만들지 않기.\n돌아와서 흥분된 인사 줄이기.\n이 두 가지가 가장 컸어요.',
    bg: '#f6f5f1',
    fg: '#222',
  },
  {
    id: 'c7',
    type: 'body',
    num: '06',
    title: '동네 동물병원,\n이 기준으로 골랐어요',
    body: '1. 진료 전 충분한 상담\n2. 보호자에게 검사 이유 설명\n3. 수의사가 자주 바뀌지 않는 곳',
    bg: '#fef3c7',
    fg: '#3a2e0c',
  },
  {
    id: 'c8',
    type: 'outro',
    title: '키우는 것보다\n함께 적응하는 일',
    body: '성견 입양을 고민하는\n1인 가구라면, 너무 걱정하지 마세요.\n시간이 답을 줍니다.',
    cta: '다음 콘텐츠 → 산책 루틴',
    bg: '#1a1a2e',
    fg: 'white',
  },
];

export const ACTIVITY_LOG: ActivityEvent[] = [
  { ts: '2026.05.07 14:32:18', tag: 'ai', note: '인터뷰 분석 완료 (5개 답변)', state: 'ok' },
  {
    ts: '2026.05.07 14:32:24',
    tag: 'ai',
    note: '카드뉴스 8장 생성 (gemini-2.5-flash, 47s)',
    state: 'ok',
  },
  { ts: '2026.05.07 14:32:51', tag: 'ai', note: '블로그 본문 생성 (1487자)', state: 'ok' },
  { ts: '2026.05.07 14:33:02', tag: 'db', note: 'draft 저장 (id=p1)', state: 'ok' },
  { ts: '2026.05.07 14:33:15', tag: 'api', note: '사용자 편집 저장', state: 'ok' },
  { ts: '2026.05.07 14:33:40', tag: 'n8n', note: '발행 큐 webhook 호출 (HMAC ok)', state: 'ok' },
  { ts: '2026.05.07 14:33:42', tag: 'naver', note: '메일 포스팅 전송 → 게시 확인', state: 'ok' },
  { ts: '2026.05.07 14:33:58', tag: 'insta', note: '미디어 컨테이너 8장 생성', state: 'ok' },
  { ts: '2026.05.07 14:34:03', tag: 'insta', note: '캐러셀 게시 완료', state: 'ok' },
];

export const NAVER_BLOG_TITLE = '5살 푸들 입양한 지 한 달, 1인 가구가 알게 된 7가지';

export const NAVER_BLOG_BODY = `안녕하세요, 민지입니다.

한 달 전, 5살 푸들을 입양했습니다. 어린 강아지가 아닌 성견을 입양한다는 게 처음에는 정말 망설여졌어요. 분리불안 이슈가 있다는 이야기, 새 보호자에게 적응하는 데 시간이 오래 걸린다는 이야기… 정보를 찾을수록 더 불안해졌습니다.

그런데 한 달이 지난 지금, 가장 강하게 드는 생각은 이거예요. **"성견 입양은 키우는 게 아니라, 함께 적응해가는 일이다."**

오늘은 그 한 달 동안 1인 가구로서 알게 된 것들을 정리해 보려고 합니다. 지금 성견 입양을 고민하고 계신 분들께 작은 도움이 되었으면 합니다.

## 1. 첫날의 30분

거실 한가운데에 앉아서, 저만 빤히 쳐다보던 30분이 있었어요. 무슨 생각을 하는지 알 수 없는 그 눈빛이, 지금도 잊혀지지 않습니다.

## 2. 적응 기간은 생각보다 길어요

보통 성견의 적응 기간은 짧으면 2주, 길면 3개월까지도 본다고 합니다. 저희 푸들도 약 3주가 지나서야 표정이 부드러워졌어요.

## 3. 분리불안, 실제로 효과 본 두 가지

여러 방법을 시도해 봤는데, 가장 효과가 좋았던 건 의외로 단순한 두 가지였습니다.

- **외출 전 의식 만들지 않기**
- **돌아왔을 때 흥분된 인사 줄이기**

> 마무리하며

성견 입양을 고민하는 1인 가구분들께 드리고 싶은 한 마디는, **너무 걱정하지 마세요**입니다.

#성견입양 #1인가구 #푸들`;

export const CURRENT_USER = {
  name: '민지',
  email: 'minji@example.com',
  initial: '민',
};

export const STATE_LABEL: Record<string, string> = {
  live: '발행됨',
  scheduled: '예약됨',
  pending: '대기',
  processing: '진행 중',
  failed: '실패',
  draft: '초안',
};

export const SPARKLINE_DATA = [120, 180, 220, 200, 280, 340, 410];

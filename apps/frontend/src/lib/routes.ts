export const routes = {
  home: '/',
  library: '/library',
  libraryItem: (id: string) => `/library/${id}`,
  libraryItemEdit: (id: string, mode?: 'insta' | 'blog') =>
    mode ? `/library/${id}/edit?mode=${mode}` : `/library/${id}/edit`,
  queue: '/queue',
  channels: '/channels',
  settings: '/settings',
  newContent: '/new',
  newInterview: '/new/interview',
  newReview: '/new/review',
  newGenerate: '/new/generate',
  newEdit: '/new/edit',
  newPublish: '/new/publish',
} as const;

export const routes = {
  home: '/',
  library: '/library',
  libraryItem: (id: string) => `/library/${id}`,
  libraryItemEdit: (id: string) => `/library/${id}/edit`,
  queue: '/queue',
  channels: '/channels',
  settings: '/settings',
  newContent: '/new',
  newInterview: '/new/interview',
  newGenerate: '/new/generate',
  newEdit: '/new/edit',
  newPublish: '/new/publish',
} as const;

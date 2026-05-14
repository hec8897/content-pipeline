'use client';

import { useState } from 'react';
import { BlogEditor } from '@/features/new-content/components/BlogEditor';

type Props = {
  initialTitle: string;
  initialBody: string;
  initialTags: string[];
};

export function BlogEditPanel({ initialTitle, initialBody, initialTags }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [tags, setTags] = useState<string[]>(initialTags);

  return (
    <BlogEditor
      title={title}
      body={body}
      tags={tags}
      onTitleChange={setTitle}
      onBodyChange={setBody}
      onTagsChange={setTags}
    />
  );
}

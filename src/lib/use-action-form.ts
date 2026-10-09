"use client";

import { useActionState, useTransition, type FormEvent } from "react";

// 서버 함수로 폼을 보내되, 보낸 뒤 입력값이 초기화되지 않게 함
// (React 기본 동작은 제출할 때마다 폼을 처음 상태로 되돌려서, 오류·미리보기 후 체크박스 등이 풀림)
export function useActionForm<S>(
  action: (state: S, formData: FormData) => Promise<S>,
  initialState: S,
) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action, initialState as Awaited<S>);
  const [, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 어떤 버튼으로 제출했는지(예: 미리보기/생성)도 함께 보냄
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };

  return [state, onSubmit, pending] as const;
}

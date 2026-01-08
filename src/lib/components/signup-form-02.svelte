<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import type { HTMLAttributes } from "svelte/elements";
  let { class: className, ...restProps }: HTMLAttributes<HTMLFormElement> = $props();
</script>
<form class={cn("flex flex-col gap-6", className)} {...restProps}>
  <Field.Group>
    <div class="flex flex-col items-center gap-1 text-center">
      <h1 class="text-2xl font-bold">ایجاد حساب کاربری</h1>
      <p class="text-muted-foreground text-balance text-sm">
        فرم زیر را پر کنید تا حساب ایجاد شود
      </p>
    </div>
    <Field.Field>
      <Field.Label for="name">نام کامل</Field.Label>
      <Input id="name" type="text" placeholder="علی احمدی" required />
    </Field.Field>
    <Field.Field>
      <Field.Label for="email">ایمیل</Field.Label>
      <Input id="email" type="email" placeholder="example@email.com" required />
      <Field.Description>
        از این برای تماس با شما استفاده می‌کنیم. ایمیل شما را با کسی به اشتراک نمی‌گذاریم.
      </Field.Description>
    </Field.Field>
    <Field.Field>
      <Field.Label for="password">رمز عبور</Field.Label>
      <Input id="password" type="password" required />
      <Field.Description>حداقل باید 8 کاراکتر باشد.</Field.Description>
    </Field.Field>
    <Field.Field>
      <Field.Label for="confirm-password">تکرار رمز عبور</Field.Label>
      <Input id="confirm-password" type="password" required />
      <Field.Description>لطفاً رمز عبور خود را تایید کنید.</Field.Description>
    </Field.Field>
    <Field.Field>
      <Button type="submit">ایجاد حساب</Button>
    </Field.Field>
    <Field.Separator>یا ادامه با</Field.Separator>
    <Field.Field>
      <Button variant="outline" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path
            d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            fill="currentColor"
          />
        </svg>
        ثبت‌نام با گیت‌هاب
      </Button>
      <Field.Description class="px-6 text-center">
        قبلاً حساب دارید؟ <a href="#/">ورود</a>
      </Field.Description>
    </Field.Field>
  </Field.Group>
</form>
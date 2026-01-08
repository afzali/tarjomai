<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import type { HTMLAttributes } from "svelte/elements";
  let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> = $props();
</script>
<div class={cn("flex flex-col gap-6", className)} {...restProps}>
  <Card.Root>
    <Card.Header class="text-center">
      <Card.Title class="text-xl">ایجاد حساب کاربری</Card.Title>
      <Card.Description>ایمیل خود را وارد کنید تا حساب ایجاد شود</Card.Description>
    </Card.Header>
    <Card.Content>
      <form>
        <Field.Group>
          <Field.Field>
            <Field.Label for="name">نام کامل</Field.Label>
            <Input id="name" type="text" placeholder="علی احمدی" required />
          </Field.Field>
          <Field.Field>
            <Field.Label for="email">ایمیل</Field.Label>
            <Input id="email" type="email" placeholder="example@email.com" required />
          </Field.Field>
          <Field.Field>
            <Field.Field class="grid grid-cols-2 gap-4">
              <Field.Field>
                <Field.Label for="password">رمز عبور</Field.Label>
                <Input id="password" type="password" required />
              </Field.Field>
              <Field.Field>
                <Field.Label for="confirm-password">تکرار رمز عبور</Field.Label>
                <Input id="confirm-password" type="password" required />
              </Field.Field>
            </Field.Field>
            <Field.Description>حداقل باید 8 کاراکتر باشد.</Field.Description>
          </Field.Field>
          <Field.Field>
            <Button type="submit">ایجاد حساب</Button>
            <Field.Description class="text-center">
              قبلاً حساب دارید؟ <a href="#/">ورود</a>
            </Field.Description>
          </Field.Field>
        </Field.Group>
      </form>
    </Card.Content>
  </Card.Root>
  <Field.Description class="px-6 text-center">
    با کلیک بر روی ادامه، شما با <a href="#/">شرایط استفاده</a>
    و <a href="#/">سیاست حفظ حریم خصوصی</a> ما موافقت می‌کنید.
  </Field.Description>
</div>
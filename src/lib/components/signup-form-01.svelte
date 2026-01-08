<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import type { ComponentProps } from "svelte";
  let { ...restProps }: ComponentProps<typeof Card.Root> = $props();
</script>
<Card.Root {...restProps}>
  <Card.Header>
    <Card.Title>ایجاد حساب کاربری</Card.Title>
    <Card.Description>اطلاعات خود را وارد کنید تا حساب کاربری ایجاد شود</Card.Description>
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
        <Field.Group>
          <Field.Field>
            <Button type="submit">ایجاد حساب</Button>
            <Button variant="outline" type="button">ثبت‌نام با گوگل</Button>
            <Field.Description class="px-6 text-center">
              قبلاً حساب دارید؟ <a href="#/">ورود</a>
            </Field.Description>
          </Field.Field>
        </Field.Group>
      </Field.Group>
    </form>
  </Card.Content>
</Card.Root>
<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputOTP from "$lib/components/ui/input-otp/index.js";
  import type { HTMLAttributes } from "svelte/elements";
  let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> = $props();
</script>
<div class={cn("flex flex-col gap-6 md:min-h-[450px]", className)} {...restProps}>
  <Card.Root class="flex-1 overflow-hidden p-0">
    <Card.Content class="grid flex-1 p-0 md:grid-cols-2">
      <form class="flex flex-col items-center justify-center p-6 md:p-8">
        <Field.Group>
          <Field.Field class="items-center text-center">
            <h1 class="text-2xl font-bold">ورود کد تایید</h1>
            <p class="text-muted-foreground text-balance text-sm">
              کد 6 رقمی به ایمیل شما ارسال شد
            </p>
          </Field.Field>
          <Field.Field>
            <Field.Label for="otp" class="sr-only">کد تایید</Field.Label>
            <InputOTP.Root maxlength={6} id="otp" required class="gap-4">
              {#snippet children({ cells })}
                <InputOTP.Group class="*:data-[slot=input-otp-slot]:border-l *:first:rounded-r-md *:first:rounded-l-none *:last:rounded-l-md *:last:rounded-r-none">
                  {#each cells.slice(0, 3) as cell (cell)}
                    <InputOTP.Slot {cell} />
                  {/each}
                </InputOTP.Group>
                <InputOTP.Separator />
                <InputOTP.Group class="*:data-[slot=input-otp-slot]:border-l *:first:rounded-r-md *:first:rounded-l-none *:last:rounded-l-md *:last:rounded-r-none">
                  {#each cells.slice(3, 6) as cell (cell)}
                    <InputOTP.Slot {cell} />
                  {/each}
                </InputOTP.Group>
              {/snippet}
            </InputOTP.Root>
            <Field.Description class="text-center">
              کد 6 رقمی ارسال شده به ایمیل خود را وارد کنید.
            </Field.Description>
          </Field.Field>
          <Field.Field>
            <Button type="submit">تایید</Button>
            <Field.Description class="text-center">
              کد را دریافت نکردید؟ <a href="#/">ارسال مجدد</a>
            </Field.Description>
          </Field.Field>
        </Field.Group>
      </form>
      <div class="bg-muted relative hidden md:block">
        <img
          src="/placeholder.svg"
          alt=""
          class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </Card.Content>
  </Card.Root>
  <Field.Description class="text-center">
    با کلیک بر روی ادامه، شما با <a href="#/">شرایط استفاده</a>
    و <a href="#/">سیاست حفظ حریم خصوصی</a> ما موافقت می‌کنید.
  </Field.Description>
</div>
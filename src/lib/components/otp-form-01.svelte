<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputOTP from "$lib/components/ui/input-otp/index.js";
  import type { ComponentProps } from "svelte";
  let { ...props }: ComponentProps<typeof Card.Root> = $props();
</script>
<Card.Root {...props}>
  <Card.Header>
    <Card.Title>ورود کد تایید</Card.Title>
    <Card.Description>کد 6 رقمی به ایمیل شما ارسال شد.</Card.Description>
  </Card.Header>
  <Card.Content>
    <form>
      <Field.Group>
        <Field.Field>
          <Field.Label for="otp">کد تایید</Field.Label>
          <InputOTP.Root maxlength={6} id="otp" required>
            {#snippet children({ cells })}
              <InputOTP.Group
                class="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:border-l *:first:rounded-r-md *:first:rounded-l-none *:last:rounded-l-md *:last:rounded-r-none"
              >
                {#each cells as cell (cell)}
                  <InputOTP.Slot {cell} />
                {/each}
              </InputOTP.Group>
            {/snippet}
          </InputOTP.Root>
          <Field.Description>
            کد 6 رقمی ارسال شده به ایمیل خود را وارد کنید.
          </Field.Description>
        </Field.Field>
        <Field.Group>
          <Button type="submit">تایید</Button>
          <Field.Description class="text-center">
            کد را دریافت نکردید؟ <a href="#/">ارسال مجدد</a>
          </Field.Description>
        </Field.Group>
      </Field.Group>
    </form>
  </Card.Content>
</Card.Root>
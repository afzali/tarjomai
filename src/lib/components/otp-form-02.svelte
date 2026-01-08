<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputOTP from "$lib/components/ui/input-otp/index.js";
  let className: string | undefined = undefined;
  export { className as class };
</script>
<div class={cn("flex flex-col gap-6", className)} {...$$restProps}>
  <form>
    <Field.Group>
      <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-2xl font-bold">ورود کد تایید</h1>
        <p class="text-muted-foreground text-balance text-sm">
          کد 6 رقمی به ایمیل شما ارسال شد.
        </p>
      </div>
      <Field.Field>
        <Field.Label for="otp" class="sr-only">کد تایید</Field.Label>
        <InputOTP.Root maxlength={6} id="otp" required>
          {#snippet children({ cells })}
            <InputOTP.Group
              class="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:border-l *:first:rounded-r-md *:first:rounded-l-none *:last:rounded-l-md *:last:rounded-r-none"
            >
              {#each cells.slice(0, 2) as cell (cell)}
                <InputOTP.Slot {cell} />
              {/each}
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group
              class="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:border-l *:first:rounded-r-md *:first:rounded-l-none *:last:rounded-l-md *:last:rounded-r-none"
            >
              {#each cells.slice(2, 4) as cell (cell)}
                <InputOTP.Slot {cell} />
              {/each}
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group
              class="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:border-l *:first:rounded-r-md *:first:rounded-l-none *:last:rounded-l-md *:last:rounded-r-none"
            >
              {#each cells.slice(4, 6) as cell (cell)}
                <InputOTP.Slot {cell} />
              {/each}
            </InputOTP.Group>
          {/snippet}
        </InputOTP.Root>
        <Field.Description class="text-center">
          کد 6 رقمی ارسال شده به ایمیل خود را وارد کنید.
        </Field.Description>
      </Field.Field>
      <Button type="submit">تایید</Button>
      <Field.Description class="text-center">
        کد را دریافت نکردید؟ <a href="#/">ارسال مجدد</a>
      </Field.Description>
    </Field.Group>
  </form>
</div>
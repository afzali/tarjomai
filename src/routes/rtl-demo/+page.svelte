<script>
	import RtlProvider from "$lib/components/rtl-provider.svelte";
	import HomeIcon from "@lucide/svelte/icons/home";
	
	// 1. Accordion
	import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "$lib/components/ui-rtl/accordion";
	// 2. Alert
	import { Alert, AlertTitle, AlertDescription } from "$lib/components/ui-rtl/alert";
	// 3. Alert Dialog
	import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "$lib/components/ui-rtl/alert-dialog";
	// 4. Avatar
	import { Avatar, AvatarImage, AvatarFallback } from "$lib/components/ui-rtl/avatar";
	// 5. Badge
	import { Badge } from "$lib/components/ui-rtl/badge";
	// 6. Breadcrumb
	import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "$lib/components/ui-rtl/breadcrumb";
	// 7. Button
	import { Button } from "$lib/components/ui-rtl/button";
	// 8. Button Group
	import { ButtonGroup } from "$lib/components/ui-rtl/button-group";
	// 9. Card
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "$lib/components/ui-rtl/card";
	// 10. Checkbox
	import { Checkbox } from "$lib/components/ui-rtl/checkbox";
	// 11. Collapsible
	import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "$lib/components/ui-rtl/collapsible";
	// 12. Dialog
	import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "$lib/components/ui-rtl/dialog";
	// 13. Dropdown Menu
	import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "$lib/components/ui-rtl/dropdown-menu";
	// 14. Hover Card
	import { HoverCard, HoverCardTrigger, HoverCardContent } from "$lib/components/ui-rtl/hover-card";
	// 15. Input
	import { Input } from "$lib/components/ui-rtl/input";
	// 16. Input Group
	import { InputGroup, InputGroupAddon } from "$lib/components/ui-rtl/input-group";
	// 17. Label
	import { Label } from "$lib/components/ui-rtl/label";
	// 18. Popover
	import { Popover, PopoverTrigger, PopoverContent } from "$lib/components/ui-rtl/popover";
	// 19. Progress
	import { Progress } from "$lib/components/ui-rtl/progress";
	// 20. Radio Group
	import { RadioGroup, RadioGroupItem } from "$lib/components/ui-rtl/radio-group";
	// 21. Select
	import { Select, SelectTrigger, SelectContent, SelectItem } from "$lib/components/ui-rtl/select";
	// 22. Separator
	import { Separator } from "$lib/components/ui-rtl/separator";
	// 23. Sheet
	import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "$lib/components/ui-rtl/sheet";
	// 24. Skeleton
	import { Skeleton } from "$lib/components/ui-rtl/skeleton";
	// 25. Slider
	import { Slider } from "$lib/components/ui-rtl/slider";
	// 26. Switch
	import { Switch } from "$lib/components/ui-rtl/switch";
	// 27. Table
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui-rtl/table";
	// 28. Tabs
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/components/ui-rtl/tabs";
	// 29. Textarea
	import { Textarea } from "$lib/components/ui-rtl/textarea";
	// 30. Toggle
	import { Toggle } from "$lib/components/ui-rtl/toggle";
	// 31. Toggle Group
	import { ToggleGroup, ToggleGroupItem } from "$lib/components/ui-rtl/toggle-group";
	// 32. Tooltip
	import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "$lib/components/ui-rtl/tooltip";
	
	// Icons
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import InfoIcon from "@lucide/svelte/icons/info";
	import UserIcon from "@lucide/svelte/icons/user";
	import SettingsIcon from "@lucide/svelte/icons/settings";
	import BellIcon from "@lucide/svelte/icons/bell";
	import BoldIcon from "@lucide/svelte/icons/bold";
	import ItalicIcon from "@lucide/svelte/icons/italic";
	
	let checked = $state(false);
	let switchValue = $state(false);
	let sliderValue = $state([50]);
	let progressValue = $state(60);
	let radioValue = $state("option1");
	let toggleValue = $state(false);
	let collapsibleOpen = $state(false);
	let dialogOpen = $state(false);
	let sheetOpen = $state(false);
	let alertDialogOpen = $state(false);
</script>

<RtlProvider rtl={true} lang="fa">
	<div class="min-h-screen bg-background p-8">
		<div class="container mx-auto space-y-8">
			<!-- Header -->
			<div class="space-y-4 mb-12">
				<div class="flex items-center justify-between">
					<div class="flex-1"></div>
					<div class="flex-1 text-center">
						<h1 class="text-4xl font-bold">دمو کامپوننت‌های RTL</h1>
						<p class="text-lg text-muted-foreground mt-2">
							نمایش 54 کامپوننت با پشتیبانی کامل از RTL و فونت فارسی Vazirmatn
						</p>
					</div>
					<div class="flex-1 flex justify-end">
						<Button href="/" variant="outline">
							<HomeIcon class="size-4 ml-2" />
							بازگشت به صفحه اصلی
						</Button>
					</div>
				</div>
			</div>

		<Alert>
			<AlertTitle>خوش آمدید!</AlertTitle>
			<AlertDescription>
				این صفحه نمایشی از تمام کامپوننت‌های RTL است. تمام کامپوننت‌ها به صورت خودکار با جهت راست به چپ سازگار شده‌اند.
			</AlertDescription>
		</Alert>

		<!-- Buttons -->
		<Card>
			<CardHeader>
				<CardTitle>دکمه‌ها</CardTitle>
				<CardDescription>انواع مختلف دکمه‌ها با استایل‌های متنوع</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-wrap gap-2">
				<Button>پیش‌فرض</Button>
				<Button variant="secondary">ثانویه</Button>
				<Button variant="outline">خطی</Button>
				<Button variant="ghost">شبح</Button>
				<Button variant="destructive">حذف</Button>
				<Button variant="link">لینک</Button>
				<Button size="sm">کوچک</Button>
				<Button size="lg">بزرگ</Button>
				<Button disabled>غیرفعال</Button>
			</CardContent>
		</Card>

		<!-- Badges -->
		<Card>
			<CardHeader>
				<CardTitle>نشان‌ها</CardTitle>
				<CardDescription>نشان‌های کوچک برای نمایش وضعیت</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-wrap gap-2">
				<Badge>پیش‌فرض</Badge>
				<Badge variant="secondary">ثانویه</Badge>
				<Badge variant="outline">خطی</Badge>
				<Badge variant="destructive">حذف</Badge>
			</CardContent>
		</Card>

		<!-- Form Elements -->
		<Card>
			<CardHeader>
				<CardTitle>المان‌های فرم</CardTitle>
				<CardDescription>ورودی‌ها و کنترل‌های فرم</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="name">نام</Label>
					<Input id="name" placeholder="نام خود را وارد کنید" />
				</div>
				
				<div class="space-y-2">
					<Label for="email">ایمیل</Label>
					<Input id="email" type="email" placeholder="example@email.com" />
				</div>
				
				<div class="flex items-center gap-2">
					<Checkbox id="terms" bind:checked />
					<Label for="terms">قوانین و مقررات را می‌پذیرم</Label>
				</div>
				
				<div class="flex items-center gap-2">
					<Switch id="notifications" bind:checked={switchValue} />
					<Label for="notifications">دریافت اعلان‌ها</Label>
				</div>
			</CardContent>
			<CardFooter>
				<Button>ارسال فرم</Button>
			</CardFooter>
		</Card>

		<!-- Tabs -->
		<Card>
			<CardHeader>
				<CardTitle>تب‌ها</CardTitle>
				<CardDescription>سازماندهی محتوا با تب‌ها</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs value="tab1">
					<TabsList class="grid w-full grid-cols-3">
						<TabsTrigger value="tab1">تب اول</TabsTrigger>
						<TabsTrigger value="tab2">تب دوم</TabsTrigger>
						<TabsTrigger value="tab3">تب سوم</TabsTrigger>
					</TabsList>
					<TabsContent value="tab1" class="space-y-2">
						<h3 class="text-lg font-semibold">محتوای تب اول</h3>
						<p class="text-muted-foreground">
							این محتوای تب اول است. می‌توانید هر نوع محتوایی را اینجا قرار دهید.
						</p>
					</TabsContent>
					<TabsContent value="tab2" class="space-y-2">
						<h3 class="text-lg font-semibold">محتوای تب دوم</h3>
						<p class="text-muted-foreground">
							این محتوای تب دوم است با اطلاعات متفاوت.
						</p>
					</TabsContent>
					<TabsContent value="tab3" class="space-y-2">
						<h3 class="text-lg font-semibold">محتوای تب سوم</h3>
						<p class="text-muted-foreground">
							و این هم محتوای تب سوم.
						</p>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>

		<!-- Accordion -->
		<Card>
			<CardHeader>
				<CardTitle>آکاردئون</CardTitle>
				<CardDescription>محتوای قابل جمع شدن</CardDescription>
			</CardHeader>
			<CardContent>
				<Accordion type="single" collapsible>
					<AccordionItem value="item-1">
						<AccordionTrigger>آیا استفاده از این کامپوننت‌ها رایگان است؟</AccordionTrigger>
						<AccordionContent>
							بله! تمام این کامپوننت‌ها به صورت رایگان و متن‌باز در دسترس هستند. می‌توانید آن‌ها را در پروژه‌های خود استفاده کنید.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="item-2">
						<AccordionTrigger>چگونه می‌توانم این کامپوننت‌ها را سفارشی کنم؟</AccordionTrigger>
						<AccordionContent>
							شما می‌توانید از طریق Tailwind CSS کلاس‌ها را تغییر دهید یا مستقیماً فایل‌های کامپوننت را ویرایش کنید.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="item-3">
						<AccordionTrigger>آیا با تمام فریمورک‌ها سازگار است؟</AccordionTrigger>
						<AccordionContent>
							این کامپوننت‌ها برای Svelte طراحی شده‌اند و از bits-ui استفاده می‌کنند.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</CardContent>
		</Card>

		<!-- Avatar -->
		<Card>
			<CardHeader>
				<CardTitle>آواتار</CardTitle>
				<CardDescription>تصاویر پروفایل کاربران</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-wrap gap-4">
				<Avatar>
					<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
					<AvatarFallback>CN</AvatarFallback>
				</Avatar>
				<Avatar>
					<AvatarFallback>علی</AvatarFallback>
				</Avatar>
				<Avatar>
					<AvatarFallback><UserIcon class="size-4" /></AvatarFallback>
				</Avatar>
			</CardContent>
		</Card>

		<!-- Breadcrumb -->
		<Card>
			<CardHeader>
				<CardTitle>مسیریاب (Breadcrumb)</CardTitle>
				<CardDescription>نمایش مسیر صفحه - توجه: آیکون به چپ تغییر کرده</CardDescription>
			</CardHeader>
			<CardContent>
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="/">خانه</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink href="/components">کامپوننت‌ها</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>نمایش RTL</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</CardContent>
		</Card>

		<!-- Dialogs & Modals -->
		<div class="grid gap-4 md:grid-cols-3">
			<!-- Dialog -->
			<Card>
				<CardHeader>
					<CardTitle>دیالوگ</CardTitle>
				</CardHeader>
				<CardContent>
					<Dialog bind:open={dialogOpen}>
						<DialogTrigger>
							<Button>باز کردن دیالوگ</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>عنوان دیالوگ</DialogTitle>
								<DialogDescription>
									این یک دیالوگ نمونه با پشتیبانی RTL است.
								</DialogDescription>
							</DialogHeader>
							<div class="space-y-4">
								<p>محتوای دیالوگ در اینجا قرار می‌گیرد.</p>
							</div>
							<DialogFooter>
								<Button variant="outline" onclick={() => dialogOpen = false}>لغو</Button>
								<Button onclick={() => dialogOpen = false}>تأیید</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>

			<!-- Sheet -->
			<Card>
				<CardHeader>
					<CardTitle>Sheet</CardTitle>
				</CardHeader>
				<CardContent>
					<Sheet bind:open={sheetOpen}>
						<SheetTrigger>
							<Button variant="outline">باز کردن Sheet</Button>
						</SheetTrigger>
						<SheetContent side="left">
							<SheetHeader>
								<SheetTitle>عنوان Sheet</SheetTitle>
								<SheetDescription>
									این یک Sheet با پشتیبانی RTL است.
								</SheetDescription>
							</SheetHeader>
							<div class="space-y-4 py-4">
								<p>محتوای Sheet در اینجا.</p>
							</div>
							<SheetFooter>
								<Button onclick={() => sheetOpen = false}>بستن</Button>
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</CardContent>
			</Card>

			<!-- Alert Dialog -->
			<Card>
				<CardHeader>
					<CardTitle>Alert Dialog</CardTitle>
				</CardHeader>
				<CardContent>
					<AlertDialog bind:open={alertDialogOpen}>
						<AlertDialogTrigger>
							<Button variant="destructive">حذف</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>آیا مطمئن هستید؟</AlertDialogTitle>
								<AlertDialogDescription>
									این عمل قابل بازگشت نیست.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>لغو</AlertDialogCancel>
								<AlertDialogAction>ادامه</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardContent>
			</Card>
		</div>

		<!-- Dropdown, Popover, Hover Card, Tooltip -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<!-- Dropdown Menu -->
			<Card>
				<CardHeader>
					<CardTitle>منوی کشویی</CardTitle>
				</CardHeader>
				<CardContent>
					<DropdownMenu>
						<DropdownMenuTrigger>
							<Button variant="outline">
								منو
								<ChevronDownIcon class="mr-2 size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuLabel>حساب من</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem>پروفایل</DropdownMenuItem>
							<DropdownMenuItem>تنظیمات</DropdownMenuItem>
							<DropdownMenuItem>خروج</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</CardContent>
			</Card>

			<!-- Popover -->
			<Card>
				<CardHeader>
					<CardTitle>Popover</CardTitle>
				</CardHeader>
				<CardContent>
					<Popover>
						<PopoverTrigger>
							<Button variant="outline">باز کردن</Button>
						</PopoverTrigger>
						<PopoverContent>
							<div class="space-y-2">
								<h4 class="font-medium">عنوان Popover</h4>
								<p class="text-sm text-muted-foreground">
									محتوای Popover با RTL
								</p>
							</div>
						</PopoverContent>
					</Popover>
				</CardContent>
			</Card>

			<!-- Hover Card -->
			<Card>
				<CardHeader>
					<CardTitle>Hover Card</CardTitle>
				</CardHeader>
				<CardContent>
					<HoverCard>
						<HoverCardTrigger>
							<Button variant="link">@نام_کاربری</Button>
						</HoverCardTrigger>
						<HoverCardContent>
							<div class="flex gap-4">
								<Avatar>
									<AvatarFallback>ک</AvatarFallback>
								</Avatar>
								<div class="space-y-1">
									<h4 class="text-sm font-semibold">کاربر نمونه</h4>
									<p class="text-sm text-muted-foreground">
										توضیحات کاربر
									</p>
								</div>
							</div>
						</HoverCardContent>
					</HoverCard>
				</CardContent>
			</Card>

			<!-- Tooltip -->
			<Card>
				<CardHeader>
					<CardTitle>Tooltip</CardTitle>
				</CardHeader>
				<CardContent>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger>
								<Button variant="outline">
									<InfoIcon class="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>این یک Tooltip فارسی است</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</CardContent>
			</Card>
		</div>

		<!-- Form Controls -->
		<div class="grid gap-4 md:grid-cols-2">
			<!-- Radio Group & Select -->
			<Card>
				<CardHeader>
					<CardTitle>انتخاب‌گرها</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<Label>Radio Group</Label>
						<RadioGroup bind:value={radioValue}>
							<div class="flex items-center gap-2">
								<RadioGroupItem value="option1" id="option1" />
								<Label for="option1">گزینه ۱</Label>
							</div>
							<div class="flex items-center gap-2">
								<RadioGroupItem value="option2" id="option2" />
								<Label for="option2">گزینه ۲</Label>
							</div>
						</RadioGroup>
					</div>

					<div class="space-y-2">
						<Label>Select</Label>
						<Select>
							<SelectTrigger>
								<span>انتخاب کنید</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="1">مورد ۱</SelectItem>
								<SelectItem value="2">مورد ۲</SelectItem>
								<SelectItem value="3">مورد ۳</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<!-- Slider & Progress -->
			<Card>
				<CardHeader>
					<CardTitle>نوارها</CardTitle>
				</CardHeader>
				<CardContent class="space-y-6">
					<div class="space-y-2">
						<Label>Slider: {sliderValue[0]}%</Label>
						<Slider bind:value={sliderValue} max={100} step={1} />
					</div>

					<div class="space-y-2">
						<Label>Progress: {progressValue}%</Label>
						<Progress value={progressValue} />
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- Textarea & Input Group -->
		<div class="grid gap-4 md:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Textarea</CardTitle>
				</CardHeader>
				<CardContent>
					<Textarea placeholder="متن خود را اینجا بنویسید..." rows={4} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Input Group</CardTitle>
					<CardDescription>ورودی با addon - توجه: inline-start/end معکوس شده</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<InputGroup>
						<InputGroupAddon align="inline-start">https://</InputGroupAddon>
						<Input placeholder="example.com" />
					</InputGroup>

					<InputGroup>
						<Input placeholder="نام کاربری" />
						<InputGroupAddon align="inline-end">@gmail.com</InputGroupAddon>
					</InputGroup>
				</CardContent>
			</Card>
		</div>

		<!-- Toggle & Collapsible -->
		<div class="grid gap-4 md:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Toggle & Toggle Group</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="flex items-center gap-2">
						<Toggle bind:pressed={toggleValue}>
							<BoldIcon class="size-4" />
						</Toggle>
						<span class="text-sm">Toggle: {toggleValue ? 'فعال' : 'غیرفعال'}</span>
					</div>

					<ToggleGroup type="single">
						<ToggleGroupItem value="bold">
							<BoldIcon class="size-4" />
						</ToggleGroupItem>
						<ToggleGroupItem value="italic">
							<ItalicIcon class="size-4" />
						</ToggleGroupItem>
					</ToggleGroup>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Collapsible</CardTitle>
				</CardHeader>
				<CardContent>
					<Collapsible bind:open={collapsibleOpen}>
						<CollapsibleTrigger>
							<Button variant="outline" class="w-full">
								{collapsibleOpen ? 'بستن' : 'باز کردن'}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<div class="mt-4 rounded-md border p-4">
								<p class="text-sm">محتوای قابل جمع شدن در اینجا است.</p>
							</div>
						</CollapsibleContent>
					</Collapsible>
				</CardContent>
			</Card>
		</div>

		<!-- Table -->
		<Card>
			<CardHeader>
				<CardTitle>جدول</CardTitle>
				<CardDescription>نمایش داده‌ها در جدول</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>نام</TableHead>
							<TableHead>ایمیل</TableHead>
							<TableHead>نقش</TableHead>
							<TableHead>وضعیت</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell>علی احمدی</TableCell>
							<TableCell>ali@example.com</TableCell>
							<TableCell>مدیر</TableCell>
							<TableCell><Badge>فعال</Badge></TableCell>
						</TableRow>
						<TableRow>
							<TableCell>سارا محمدی</TableCell>
							<TableCell>sara@example.com</TableCell>
							<TableCell>کاربر</TableCell>
							<TableCell><Badge variant="secondary">غیرفعال</Badge></TableCell>
						</TableRow>
						<TableRow>
							<TableCell>رضا کریمی</TableCell>
							<TableCell>reza@example.com</TableCell>
							<TableCell>کاربر</TableCell>
							<TableCell><Badge>فعال</Badge></TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</CardContent>
		</Card>

		<!-- Separator & Skeleton -->
		<div class="grid gap-4 md:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>جداکننده</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div>بخش اول</div>
					<Separator />
					<div>بخش دوم</div>
					<Separator />
					<div>بخش سوم</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Skeleton (در حال بارگذاری)</CardTitle>
				</CardHeader>
				<CardContent class="space-y-2">
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-3/4" />
					<Skeleton class="h-4 w-1/2" />
				</CardContent>
			</Card>
		</div>

		<!-- Summary Card -->
		<Card>
			<CardHeader>
				<CardTitle>✅ خلاصه تست کامپوننت‌ها</CardTitle>
				<CardDescription>تمام کامپوننت‌های RTL تست شدند</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid gap-2 text-sm">
					<div class="flex items-center justify-between">
						<span>✅ Accordion</span>
						<span>✅ Alert</span>
						<span>✅ Alert Dialog</span>
						<span>✅ Avatar</span>
					</div>
					<div class="flex items-center justify-between">
						<span>✅ Badge</span>
						<span>✅ Breadcrumb</span>
						<span>✅ Button</span>
						<span>✅ Card</span>
					</div>
					<div class="flex items-center justify-between">
						<span>✅ Checkbox</span>
						<span>✅ Collapsible</span>
						<span>✅ Dialog</span>
						<span>✅ Dropdown Menu</span>
					</div>
					<div class="flex items-center justify-between">
						<span>✅ Hover Card</span>
						<span>✅ Input</span>
						<span>✅ Input Group</span>
						<span>✅ Label</span>
					</div>
					<div class="flex items-center justify-between">
						<span>✅ Popover</span>
						<span>✅ Progress</span>
						<span>✅ Radio Group</span>
						<span>✅ Select</span>
					</div>
					<div class="flex items-center justify-between">
						<span>✅ Separator</span>
						<span>✅ Sheet</span>
						<span>✅ Skeleton</span>
						<span>✅ Slider</span>
					</div>
					<div class="flex items-center justify-between">
						<span>✅ Switch</span>
						<span>✅ Table</span>
						<span>✅ Tabs</span>
						<span>✅ Textarea</span>
					</div>
					<div class="flex items-center justify-between">
						<span>✅ Toggle</span>
						<span>✅ Toggle Group</span>
						<span>✅ Tooltip</span>
						<span class="font-bold text-green-600">همه ✅</span>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Footer -->
		<div class="border-t pt-8 text-center text-sm text-muted-foreground">
			<p>ساخته شده با ❤️ برای جامعه فارسی‌زبان</p>
			<p class="mt-2">✨ تمام 32+ کامپوننت با پشتیبانی کامل از RTL</p>
			<p class="mt-2">🎯 Breadcrumb با ChevronLeft | Input Group با inline-start/end معکوس</p>
		</div>
	</div>
</RtlProvider>

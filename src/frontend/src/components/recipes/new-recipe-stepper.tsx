type Props = { ingredientCount: number; stepCount: number };

export function NewRecipeStepper({ ingredientCount, stepCount }: Props) {
  return (
    <nav aria-label="Các phần công thức" className="lg:border-r lg:border-border lg:pr-6">
      <div className="flex gap-2 overflow-x-auto lg:flex-col">
        <a href="#basic-info" className="shrink-0 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="mr-3 text-muted-foreground">01</span>Thông tin cơ bản</a>
        <a href="#ingredients" className="shrink-0 rounded-md px-4 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="mr-3">02</span>Thành phần &amp; định lượng</a>
        <a href="#sop" className="shrink-0 rounded-md px-4 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="mr-3">03</span>Quy trình SOP</a>
      </div>
      <p className="mt-6 hidden border-t border-border pt-4 text-xs text-muted-foreground lg:block">Bản nháp<br />{ingredientCount} nguyên liệu · {stepCount} bước</p>
    </nav>
  );
}

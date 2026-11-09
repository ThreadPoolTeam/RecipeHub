type Props = {
  ingredientCount: number;
  stepCount: number;
  activeStep: number;
  onStepChange: (step: number) => void;
};

export function NewRecipeStepper({ ingredientCount, stepCount, activeStep, onStepChange }: Props) {
  return (
    <nav aria-label="Các phần công thức" className="lg:border-r lg:border-border lg:pr-6">
      <div className="flex gap-2 overflow-x-auto lg:flex-col">
        {['Thông tin cơ bản', 'Thành phần & định lượng', 'Quy trình SOP'].map((label, index) => (
          <button key={label} type="button" aria-current={activeStep === index ? 'step' : undefined}
            aria-controls={`recipe-step-${index}`} onClick={() => onStepChange(index)}
            className={`shrink-0 rounded-md px-4 py-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeStep === index
                ? 'border border-border bg-card font-medium text-foreground shadow-soft'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}>
            <span className="mr-3 text-muted-foreground">0{index + 1}</span>{label}
          </button>
        ))}
      </div>
      <p className="mt-6 hidden border-t border-border pt-4 text-xs text-muted-foreground lg:block">Bản nháp<br />{ingredientCount} nguyên liệu · {stepCount} bước</p>
    </nav>
  );
}

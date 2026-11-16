import type { Ingredient, RecipeIngredient } from '@/lib/demo/types';

const linkPattern = /^Bước [1-9]\d*(?:, Bước [1-9]\d*)*$/;

export function parseStepLinks(stageNote?: string | null): number[] {
  if (!stageNote || !linkPattern.test(stageNote)) return [];
  return [...stageNote.matchAll(/Bước (\d+)/g)].map((match) => Number(match[1]));
}

export function formatStepLinks(orders: number[]): string {
  return [...new Set(orders.filter((order) => Number.isSafeInteger(order) && order > 0))]
    .sort((a, b) => a - b).map((order) => `Bước ${order}`).join(', ');
}

export function setStepLink(stageNote: string | undefined, order: number, selected: boolean): string | undefined {
  const links = parseStepLinks(stageNote);
  if (!selected && !links.includes(order)) return stageNote;
  return formatStepLinks(selected ? [...links, order] : links.filter((link) => link !== order));
}

export function remapStepLinks(ingredients: RecipeIngredient[], map: (order: number) => number | null): RecipeIngredient[] {
  return ingredients.map((ingredient) => {
    const links = parseStepLinks(ingredient.stageNote);
    if (!links.length) return ingredient;
    return { ...ingredient, stageNote: formatStepLinks(links.map(map).filter((order): order is number => order !== null)) };
  });
}

export function stepIngredientText(ingredients: RecipeIngredient[], ingredientMap: Record<string, Ingredient>, order: number): string {
  return ingredients.filter((item) => parseStepLinks(item.stageNote).includes(order))
    .map((item) => `${item.quantity} ${item.unit} ${ingredientMap[item.ingredientId]?.name || 'Nguyên liệu chưa cập nhật'}`).join(', ');
}

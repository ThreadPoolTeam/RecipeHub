import { Role, User, SessionInfo, RecipeVersion } from './types';

export function isPathAllowedForUser(
  pathname: string,
  session: SessionInfo | User | null
): { allowed: boolean; redirectUrl?: string } {
  if (!session) {
    return { allowed: false, redirectUrl: `/login?next=${encodeURIComponent(pathname)}` };
  }

  // Public / Auth routes
  if (pathname.startsWith('/login') || pathname.startsWith('/forbidden')) {
    return { allowed: true };
  }

  // /approvals requires canApprove
  if (pathname.startsWith('/approvals')) {
    if (session.canApprove) {
      return { allowed: true };
    }
    return { allowed: false, redirectUrl: '/forbidden' };
  }

  // /rnd routes require rnd role
  if (pathname.startsWith('/rnd')) {
    if (session.role === 'rnd') {
      return { allowed: true };
    }
    return { allowed: false, redirectUrl: '/forbidden' };
  }

  // /viewer routes require viewer role
  if (pathname.startsWith('/viewer')) {
    if (session.role === 'viewer') {
      return { allowed: true };
    }
    return { allowed: false, redirectUrl: '/forbidden' };
  }

  // /admin routes require admin role
  if (pathname.startsWith('/admin')) {
    if (session.role === 'admin') {
      return { allowed: true };
    }
    return { allowed: false, redirectUrl: '/forbidden' };
  }

  // /platform overview is shared
  if (pathname.startsWith('/platform')) {
    return { allowed: true };
  }

  return { allowed: true };
}

export function getDefaultDashboardForRole(role: Role): string {
  switch (role) {
    case 'rnd':
      return '/rnd';
    case 'viewer':
      return '/viewer';
    case 'admin':
      return '/admin';
    default:
      return '/platform';
  }
}

export function canCreateRecipe(user: User | SessionInfo): boolean {
  return user.role === 'rnd';
}

export function canEditRecipe(user: User | SessionInfo, recipe: RecipeVersion): boolean {
  if (user.role !== 'rnd') return false;
  // Only Draft status can be edited directly
  return recipe.status === 'Draft';
}

export function canSubmitRecipe(user: User | SessionInfo, recipe: RecipeVersion): boolean {
  if (user.role !== 'rnd') return false;
  if (recipe.status !== 'Draft') return false;
  if (!recipe.ingredients || recipe.ingredients.length === 0) return false;
  if (!recipe.steps || recipe.steps.length === 0) return false;
  return true;
}

export function canApproveRecipe(user: User | SessionInfo, recipe: RecipeVersion): boolean {
  if (!user.canApprove) return false;
  if (recipe.status !== 'PendingApproval') return false;
  // Demo invariant: Reviewer cannot approve recipe they authored
  if (recipe.creatorEmail === user.email) return false;
  return true;
}

export function canViewRecipe(user: User, recipe: RecipeVersion): boolean {
  if (user.role === 'admin' || user.role === 'rnd') {
    return true;
  }
  if (user.role === 'viewer') {
    return recipe.status === 'Approved' && (user.allowedRecipeIds || []).includes(recipe.recipeId);
  }
  return false;
}

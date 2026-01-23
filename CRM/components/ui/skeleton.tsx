import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-md',
        'bg-gradient-to-r from-muted via-muted to-muted/50',
        'dark:from-muted dark:via-muted dark:to-muted/50',
        className
      )}
      {...props}
    >
      <div
        className="absolute inset-0 animate-shimmer-slide bg-gradient-to-r from-transparent via-white/15 dark:via-white/10 to-transparent"
      />
    </div>
  )
}

export { Skeleton }

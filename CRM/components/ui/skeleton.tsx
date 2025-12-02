import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-md',
        'bg-gradient-to-r from-muted via-muted/80 to-muted',
        className
      )}
      {...props}
    >
      <div 
        className="absolute inset-0 animate-shimmer-slide bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent"
      />
    </div>
  )
}

export { Skeleton }

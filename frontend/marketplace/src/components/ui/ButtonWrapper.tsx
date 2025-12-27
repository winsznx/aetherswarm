import { Button as ShadButton, ButtonProps } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
    // Using default mapping for now as ShadCN has its own variants
    return (
        <ShadButton
            className={cn(className)}
            variant={variant}
            {...props}
            aria-label={props['aria-label'] || props.children?.toString()}
        />
    );
}

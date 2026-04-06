'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

/**
 * AvatarImage — uses next/image for automatic optimization (WebP, srcset,
 * lazy loading). Tells Radix the image loaded/errored so AvatarFallback
 * works correctly.
 */
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, alt = 'Avatar', ...props }, ref) => {
  const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading')

  // Reset status when src changes
  React.useEffect(() => {
    setStatus(src ? 'loading' : 'error')
  }, [src])

  return (
    <>
      {/* Hidden Radix image — only used to drive the fallback state.
          We give it a 1x1 data URI when our next/image loads successfully,
          or no src on error so Radix shows the fallback. */}
      <AvatarPrimitive.Image
        ref={ref}
        className="sr-only"
        src={status === 'loaded' ? 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==' : undefined}
        alt={alt ?? ''}
        {...props}
      />
      {/* Visible optimized image */}
      {src && status !== 'error' && (
        <Image
          src={src}
          alt={alt ?? ''}
          fill
          sizes="48px"
          className={cn('aspect-square h-full w-full object-cover', className)}
          loading="lazy"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
    </>
  )
})
AvatarImage.displayName = 'AvatarImage'

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted',
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

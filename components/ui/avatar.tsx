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
 * AvatarImage — wraps next/image for automatic optimization (WebP, srcset,
 * lazy loading) while preserving Radix Avatar's fallback behavior.
 *
 * If src is empty/undefined, Radix never mounts the image so the
 * AvatarFallback renders instead.
 */
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, alt, ...props }, ref) => {
  // Radix AvatarPrimitive.Image handles the loaded/error state machine that
  // controls whether the fallback shows. We render it as the outer wrapper
  // (hidden via sr-only) so Radix tracks the src lifecycle, and layer the
  // optimized next/image on top for the actual visual.
  return (
    <>
      {/* Hidden Radix image — drives fallback state only */}
      <AvatarPrimitive.Image
        ref={ref}
        className="sr-only"
        src={src}
        alt={alt ?? ''}
        {...props}
      />
      {/* Visible optimized image */}
      {src && (
        <Image
          src={src}
          alt={alt ?? ''}
          fill
          sizes="48px"
          className={cn('aspect-square h-full w-full object-cover', className)}
          loading="lazy"
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

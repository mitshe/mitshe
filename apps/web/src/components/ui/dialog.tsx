"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const ResponsiveContext = React.createContext<{ isDesktop: boolean }>({
  isDesktop: true,
});

function Dialog({
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <ResponsiveContext.Provider value={{ isDesktop }}>
        <DialogPrimitive.Root data-slot="dialog" {...props}>
          {children}
        </DialogPrimitive.Root>
      </ResponsiveContext.Provider>
    );
  }

  return (
    <ResponsiveContext.Provider value={{ isDesktop }}>
      <Sheet {...props}>{children}</Sheet>
    </ResponsiveContext.Provider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const { isDesktop } = React.useContext(ResponsiveContext);

  if (isDesktop) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
  }

  return <SheetTrigger {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const { isDesktop } = React.useContext(ResponsiveContext);

  if (isDesktop) {
    return (
      <DialogPortal data-slot="dialog-portal">
        <DialogOverlay />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-md",
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-md p-1.5 opacity-70 transition-all hover:opacity-100 hover:bg-muted focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }

  return (
    <SheetContent side="bottom" className={cn("", className)}>
      {children}
    </SheetContent>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { isDesktop } = React.useContext(ResponsiveContext);

  if (isDesktop) {
    return (
      <div
        data-slot="dialog-header"
        className={cn(
          "flex flex-col gap-2 text-center sm:text-left",
          className,
        )}
        {...props}
      />
    );
  }

  return <SheetHeader className={className} {...props} />;
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  const { isDesktop } = React.useContext(ResponsiveContext);

  if (isDesktop) {
    return (
      <div
        data-slot="dialog-body"
        className={cn("-mr-2 pr-2", className)}
        {...props}
      />
    );
  }

  return <SheetBody className={className} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const { isDesktop } = React.useContext(ResponsiveContext);

  if (isDesktop) {
    return (
      <div
        data-slot="dialog-footer"
        className={cn(
          "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
          className,
        )}
        {...props}
      />
    );
  }

  return <SheetFooter className={className} {...props} />;
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const { isDesktop } = React.useContext(ResponsiveContext);

  if (isDesktop) {
    return (
      <DialogPrimitive.Title
        data-slot="dialog-title"
        className={cn("text-lg font-semibold tracking-tight", className)}
        {...props}
      />
    );
  }

  return <SheetTitle className={className} {...props} />;
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const { isDesktop } = React.useContext(ResponsiveContext);

  if (isDesktop) {
    return (
      <DialogPrimitive.Description
        data-slot="dialog-description"
        className={cn(
          "text-muted-foreground text-sm leading-relaxed",
          className,
        )}
        {...props}
      />
    );
  }

  return <SheetDescription className={className} {...props} />;
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};

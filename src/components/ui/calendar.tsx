
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0 w-full", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4 w-full",
        month_caption: "hidden", // We use custom header in the page
        nav: "hidden",
        month_grid: "w-full border-collapse border border-border rounded-xl overflow-hidden",
        weekdays: "flex w-full bg-muted/30",
        weekday: "text-muted-foreground flex-1 font-semibold text-xs py-3 text-center border-b border-border",
        weeks: "flex flex-col w-full",
        week: "flex w-full border-b border-border last:border-0",
        day: cn(
          "h-24 flex-1 p-0 font-medium flex justify-end items-start hover:bg-primary/5 transition-colors rounded-none outline-none focus:bg-primary/5 border-r border-border last:border-r-0 group"
        ),
        day_button: "h-full w-full p-2 text-right flex justify-end items-start",
        selected: "bg-primary/10 text-primary font-bold",
        today: "relative after:content-[''] after:absolute after:top-2 after:right-2 after:w-7 after:h-7 after:bg-destructive after:rounded-full after:-z-10 text-white font-bold",
        outside: "day-outside text-muted-foreground/30 opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

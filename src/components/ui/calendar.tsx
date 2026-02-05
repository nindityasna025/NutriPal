
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
        caption: "flex justify-between pt-1 relative items-center px-4 mb-4",
        caption_label: "text-2xl font-bold font-headline",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 border-border"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse border border-border rounded-xl overflow-hidden",
        head_row: "flex w-full bg-muted/30",
        head_cell: "text-muted-foreground flex-1 font-semibold text-xs py-3 text-center border-b border-border",
        weeks: "flex flex-col w-full",
        row: "flex w-full border-b border-border last:border-0",
        cell: "relative h-24 flex-1 p-0 text-right border-r border-border last:border-r-0 group",
        day: cn(
          "h-full w-full p-2 font-medium flex justify-end items-start hover:bg-primary/5 transition-colors rounded-none outline-none focus:bg-primary/5"
        ),
        day_range_end: "day-range-end",
        day_selected: "bg-primary/10 text-primary font-bold",
        day_today: "relative after:content-[''] after:absolute after:top-2 after:right-2 after:w-7 after:h-7 after:bg-destructive after:rounded-full after:-z-10 text-white font-bold",
        day_outside: "day-outside text-muted-foreground/30 opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
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

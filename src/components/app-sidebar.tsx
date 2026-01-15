import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { PlasmidView } from "@/components/plasmid-view"
import { Badge } from "@/components/ui/badge"
import { getSequentialColors, getPalettes } from "dicopal"

const LOGO_CX = 150
const LOGO_CY = 150

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function createGenePath(opts: {
  startAngle: number
  lengthAngle: number
  tipLengthAngle: number
  R_in: number
  R_out: number
  flare: number
}) {
  const { startAngle, lengthAngle, tipLengthAngle, R_in, R_out, flare } = opts
  const R_mid = (R_in + R_out) / 2
  const shoulderAngle = startAngle + lengthAngle
  const tipAngle = shoulderAngle + tipLengthAngle

  const p1 = polarToCartesian(LOGO_CX, LOGO_CY, R_in, startAngle)
  const p2 = polarToCartesian(LOGO_CX, LOGO_CY, R_out, startAngle)
  const p3 = polarToCartesian(LOGO_CX, LOGO_CY, R_out, shoulderAngle)
  const p4 = polarToCartesian(LOGO_CX, LOGO_CY, R_out + flare, shoulderAngle)
  const p5 = polarToCartesian(LOGO_CX, LOGO_CY, R_mid, tipAngle)
  const p6 = polarToCartesian(LOGO_CX, LOGO_CY, R_in - flare, shoulderAngle)
  const p7 = polarToCartesian(LOGO_CX, LOGO_CY, R_in, shoulderAngle)

  const largeArcFlag = lengthAngle > 180 ? "1" : "0"

  return [
    `M ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${R_out} ${R_out} 0 ${largeArcFlag} 1 ${p3.x} ${p3.y}`,
    `L ${p4.x} ${p4.y}`,
    `L ${p5.x} ${p5.y}`,
    `L ${p6.x} ${p6.y}`,
    `L ${p7.x} ${p7.y}`,
    `A ${R_in} ${R_in} 0 ${largeArcFlag} 0 ${p1.x} ${p1.y}`,
    "Z",
  ].join(" ")
}

function PlasmidLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 300"
      role="img"
      aria-label="Plasmid logo"
    >
      <circle
        cx="150"
        cy="150"
        r="130"
        stroke="currentColor"
        strokeWidth={8}
        fill="none"
      />
      <g>
        <path
          d={createGenePath({
            startAngle: 10,
            lengthAngle: 90,
            tipLengthAngle: 8,
            R_in: 80,
            R_out: 148,
            flare: 11,
          })}
          fill="#F2748E"
        />
        <path
          d={createGenePath({
            startAngle: 120,
            lengthAngle: 60,
            tipLengthAngle: 8,
            R_in: 80,
            R_out: 148,
            flare: 11,
          })}
          fill="#BADB9A"
        />
        <path
          d={createGenePath({
            startAngle: 200,
            lengthAngle: 80,
            tipLengthAngle: 8,
            R_in: 80,
            R_out: 148,
            flare: 11,
          })}
          fill="#98D3C4"
        />
        <path
          d={createGenePath({
            startAngle: 300,
            lengthAngle: 40,
            tipLengthAngle: 8,
            R_in: 80,
            R_out: 148,
            flare: 11,
          })}
          fill="#D9DAD9"
        />
      </g>
    </svg>
  )
}

type ControlProps = {
  showLinks: boolean
  onToggleLinks: (value: boolean) => void
  showLabels: boolean
  onToggleLabels: (value: boolean) => void
  labelType: "points" | "clusters"
  onChangeLabelType: (value: "points" | "clusters") => void
  colorBy?: string
  colorOptions: string[]
  columnDisplayNames: Record<string, string>
  columnCategories: Record<string, string[]>
  numericColumns: Set<string>
  onChangeColorBy: (value?: string) => void
  pointSize: number
  onChangePointSize: (value: number) => void
  linkOpacity: number
  onChangeLinkOpacity: (value: number) => void
  pointGreyoutOpacity: number
  onChangePointGreyoutOpacity: (value: number) => void
  linkGreyoutOpacity: number
  onChangeLinkGreyoutOpacity: (value: number) => void
  hideNoMetadata: boolean
  onToggleHideNoMetadata: (value: boolean) => void
  hideIMGPR: boolean
  onToggleHideIMGPR: (value: boolean) => void
  reversePalette: boolean
  onToggleReversePalette: (value: boolean) => void
  continuousPalette: string
  onChangeContinuousPalette: (value: string) => void
  selectNeighbors: boolean
  onToggleSelectNeighbors: (value: boolean) => void
  plasmidId?: string | null
}

export function AppSidebar({
  showLinks,
  onToggleLinks,
  showLabels,
  onToggleLabels,
  labelType,
  onChangeLabelType,
  colorBy,
  colorOptions,
  columnDisplayNames,
  columnCategories,
  numericColumns,
  onChangeColorBy,
  pointSize,
  onChangePointSize,
  linkOpacity,
  onChangeLinkOpacity,
  pointGreyoutOpacity,
  onChangePointGreyoutOpacity,
  linkGreyoutOpacity,
  onChangeLinkGreyoutOpacity,
  hideNoMetadata,
  onToggleHideNoMetadata,
  hideIMGPR,
  onToggleHideIMGPR,
  reversePalette,
  onToggleReversePalette,
  continuousPalette,
  onChangeContinuousPalette,
  selectNeighbors,
  onToggleSelectNeighbors,
  plasmidId,
  ...props
}: React.ComponentProps<typeof Sidebar> & ControlProps) {
  const { setOpenMobile } = useSidebar()

  const categoryColors: Record<string, string> = {
    plasmid: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
    mobility: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    defense: "bg-green-500/20 text-green-700 dark:text-green-300",
    PDC: "bg-teal-500/20 text-teal-700 dark:text-teal-300",
    "anti-defense": "bg-orange-500/20 text-orange-700 dark:text-orange-300",
    AMR: "bg-red-500/20 text-red-700 dark:text-red-300",
    MGE: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
    host: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
    taxonomy: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
    ecosystem: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    network: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
    metadata: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
  }

  const paletteDisabled = !colorBy || !numericColumns.has(colorBy)

  // Memoize the list of sequential palettes to avoid re-fetching on every render
  const sequentialPalettes = React.useMemo(() => {
    const allPalettes = getPalettes({ type: 'sequential' })
    const uniqueMap = new Map()
    
    allPalettes.forEach((p) => {
      // Just keep the first one encountered for each name, 
      // or we could pick a specific one (like max classes), but usually names are enough.
      if (!uniqueMap.has(p.name)) {
        uniqueMap.set(p.name, p)
      }
    })

    return Array.from(uniqueMap.values())
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
  }, [])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="px-4 pt-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full pr-2">
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-2 rounded-xl text-left flex-1"
              >
                <a href="#" className="flex items-center gap-3">
                  <PlasmidLogo className="h-5 w-5 text-foreground" />
                  <span className="text-base font-semibold tracking-tight">
                    Plasmid Defense Network
                  </span>
                </a>
              </SidebarMenuButton>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpenMobile(false)}
                className="md:hidden h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex flex-1 flex-col justify-between pb-6">
        <div className="px-4 text-[0.7rem]">
          {/* NOTE:
              Removed "relative z-20" from Card to avoid creating a stacking context
              that can interfere with Radix portals. */}
          <Card className="border-muted/70 bg-card/70 text-[0.7rem]">
            <CardContent className="space-y-3">
              {/* Color by */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Color by
                </div>
                <Select
                  value={colorBy ?? ""}
                  onValueChange={(v) => onChangeColorBy(v || undefined)}
                  disabled={!colorOptions.length}
                >
                  <SelectTrigger className="w-full justify-between text-[0.64rem]">
                    <SelectValue
                      placeholder="Choose a column"
                      className="text-[0.6rem]"
                    />
                  </SelectTrigger>

                  {/* z-index to ensure it appears above offcanvas/overlays */}
                  <SelectContent className="min-w-[400px] z-[1000]" portalled={false}>
                    {colorOptions.map((opt) => {
                      const categories = columnCategories[opt] || []
                      const isNumeric = numericColumns.has(opt)
                      return (
                        <SelectItem
                          key={opt}
                          value={opt}
                          className="pr-8 cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="truncate flex-1 min-w-0">
                              {columnDisplayNames[opt] || opt}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {categories.length > 0 &&
                                categories.map((category) => {
                                  const categoryColor =
                                    categoryColors[category] || ""
                                  return (
                                    <span
                                      key={category}
                                      className={`px-1.5 py-0.5 text-[0.6rem] rounded-md font-medium whitespace-nowrap ${categoryColor}`}
                                    >
                                      {category}
                                    </span>
                                  )
                                })}
                              <span className="flex items-center justify-center px-1 h-4 text-[0.5rem] font-bold rounded bg-foreground/15 text-foreground/60">
                                {isNumeric ? "123" : "ABC"}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Palette */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Palette
                </div>
                {paletteDisabled && (
                  <p className="text-[0.6rem] text-muted-foreground mt-[-0.25rem]">
                    Choose a{" "}
                    <span className="font-medium">numeric</span> “Color by”
                    option to enable palettes.
                  </p>
                )}
                <Select
                  value={continuousPalette ?? ""}
                  onValueChange={(v) => onChangeContinuousPalette(v)}
                  disabled={paletteDisabled}
                >
                  <SelectTrigger
                    className={`w-full justify-between text-[0.64rem] ${
                      paletteDisabled ? "opacity-50" : ""
                    }`}
                  >
                    <SelectValue
                      placeholder="Select palette"
                      className="text-[0.6rem]"
                    />
                  </SelectTrigger>

                  {/* z-index to ensure it appears above offcanvas/overlays */}
                  <SelectContent className="z-[1000] max-h-[300px]" portalled={false}>
                    {sequentialPalettes.map((paletteObj: any) => {
                        const p = paletteObj.name
                        // Generate a small preview of 5 colors
                        const colors = getSequentialColors(p, 5) || []
                        return (
                          <SelectItem
                            key={p}
                            value={p}
                            className="pr-8 cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className="truncate flex-1 min-w-0">{p}</span>
                              <div className="flex h-3 w-16 shrink-0 overflow-hidden rounded bg-gray-100 ring-1 ring-inset ring-black/10">
                                {colors.map((c, i) => (
                                  <div
                                    key={i}
                                    style={{ backgroundColor: c }}
                                    className="h-full flex-1"
                                  />
                                ))}
                              </div>
                            </div>
                          </SelectItem>
                        )
                      }
                    )}
                  </SelectContent>
                </Select>

                <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${paletteDisabled ? "opacity-50" : ""}`}>
                  <div>
                    <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                      Reverse palette
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground">
                      Flip color direction
                    </p>
                  </div>
                  <Switch
                    aria-label="Reverse palette"
                    checked={reversePalette}
                    onCheckedChange={(v) => onToggleReversePalette(v)}
                    disabled={paletteDisabled}
                  />
                </div>
              </div>

              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Visualization Settings
              </div>

              <div className="space-y-2 text-[0.68rem]">
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                      Show links
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground">
                      Toggle edges for context
                    </p>
                  </div>
                  <Switch
                    aria-label="Toggle links"
                    checked={showLinks}
                    onCheckedChange={(v) => onToggleLinks(v)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                      Show labels
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground">
                      Toggle label visibility (affects performance)
                    </p>
                  </div>
                  <Switch
                    aria-label="Toggle labels"
                    checked={showLabels}
                    onCheckedChange={(v) => onToggleLabels(v)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                      Select neighbors
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground">
                      Highlight connected nodes on click
                    </p>
                  </div>
                  <Switch
                    aria-label="Toggle select neighbors"
                    checked={selectNeighbors}
                    onCheckedChange={(v) => onToggleSelectNeighbors(v)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                    Label type
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={labelType === "points" ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1 text-[0.68rem] hover:opacity-80 transition-opacity"
                      onClick={() => onChangeLabelType("points")}
                    >
                      Node IDs
                    </Badge>
                    <Badge
                      variant={labelType === "clusters" ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1 text-[0.68rem] hover:opacity-80 transition-opacity"
                      onClick={() => onChangeLabelType("clusters")}
                    >
                      PTUs
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                      Point size
                    </div>
                    <span className="text-[0.6rem] text-muted-foreground">
                      {pointSize.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={50}
                    step={0.5}
                    value={[pointSize]}
                    onValueChange={([v]) => onChangePointSize(v)}
                  />
                </div>

                <div className="space-y-2 rounded-lg border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                      Link opacity
                    </div>
                    <span className="text-[0.6rem] text-muted-foreground">
                      {linkOpacity.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={[linkOpacity]}
                    onValueChange={([v]) => onChangeLinkOpacity(v)}
                  />
                </div>

                <div className="space-y-2 rounded-lg border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                      Point greyout opacity
                    </div>
                    <span className="text-[0.6rem] text-muted-foreground">
                      {pointGreyoutOpacity.toFixed(3)}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={0.5}
                    step={0.005}
                    value={[pointGreyoutOpacity]}
                    onValueChange={([v]) => onChangePointGreyoutOpacity(v)}
                  />
                </div>

                <div className="space-y-2 rounded-lg border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                      Link greyout opacity
                    </div>
                    <span className="text-[0.6rem] text-muted-foreground">
                      {linkGreyoutOpacity.toFixed(3)}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={0.5}
                    step={0.005}
                    value={[linkGreyoutOpacity]}
                    onValueChange={([v]) => onChangeLinkGreyoutOpacity(v)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                      Hide empty metadata
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground">
                      Hide nodes with empty values in selected column
                    </p>
                  </div>
                  <Switch
                    aria-label="Hide nodes without metadata"
                    checked={hideNoMetadata}
                    onCheckedChange={(v) => onToggleHideNoMetadata(v)}
                    disabled={!colorBy}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <div className="text-[0.64rem] font-semibold tracking-wide uppercase">
                      Hide IMGPR plasmids
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground">
                      Hide plasmids from IMG/PR database
                    </p>
                  </div>
                  <Switch
                    aria-label="Hide IMGPR plasmids"
                    checked={hideIMGPR}
                    onCheckedChange={(v) => onToggleHideIMGPR(v)}
                  />
                </div>


              </div>
            </CardContent>
          </Card>

          <PlasmidView plasmidId={plasmidId} className="mt-4" />
        </div>
      </SidebarContent>

      <SidebarFooter className="hidden" />
    </Sidebar>
  )
}
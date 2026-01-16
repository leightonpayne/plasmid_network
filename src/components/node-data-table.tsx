import * as React from "react"
import "@glideapps/glide-data-grid/dist/index.css"

import {
  DataEditor,
  GridCellKind,
  getDefaultTheme,
  GridColumnIcon,
  CompactSelection,
} from "@glideapps/glide-data-grid"
import type {
  GridCell,
  TextCell,
  Theme,
  GridSelection,
  DataEditorRef,
} from "@glideapps/glide-data-grid"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconFilter } from "@tabler/icons-react"



type NodeDataTableProps = {
  open: boolean
  dataSource: unknown 
  columns: string[]
  columnDisplayNames?: Record<string, string>
  totalRows: number
  focusRowIndex?: number | null
  focusTrigger?: number
  onIndexReady?: () => void
  onOpen?: () => void
  selectedRowIndices?: number[]
  onRowSelectionChange?: (rows: number[]) => void
  showOnlySelected?: boolean
  onShowOnlySelectedChange?: (value: boolean) => void
}

export function NodeDataTable({
  open,
  dataSource,
  columns = [],
  columnDisplayNames = {},
  totalRows = 0,
  focusRowIndex = null,
  focusTrigger = 0,
  onIndexReady,
  onOpen,
  selectedRowIndices,
  onRowSelectionChange,
  showOnlySelected = false,
  onShowOnlySelectedChange,
}: NodeDataTableProps) {
  const { resolvedTheme } = useTheme()
  const isDark = (resolvedTheme ?? "dark") === "dark"

  
  const deferredSelectedRowIndices = React.useDeferredValue(selectedRowIndices)
  
  
  
  
  
  const effectiveSelectedRowIndices = React.useMemo(() => {
    
    if (!selectedRowIndices || selectedRowIndices.length === 0) {
      return selectedRowIndices
    }
    
    if (!deferredSelectedRowIndices || deferredSelectedRowIndices.length === 0) {
      return selectedRowIndices
    }
    
    return deferredSelectedRowIndices
  }, [selectedRowIndices, deferredSelectedRowIndices])

  
  const [gridSelection, setGridSelection] = React.useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  })
  
  
  const syncingFromExternalRef = React.useRef(false)

  const gridRef = React.useRef<DataEditorRef | null>(null)
  const [searchValue, setSearchValue] = React.useState("")
  const searchInputRef = React.useRef<HTMLInputElement | null>(null)

  // Sort state - default to sorting by 'id' (Plasmid ID) ascending
  const [sortColumn, setSortColumn] = React.useState<string>("id")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  const gridColumns = React.useMemo(() => {
    return columns.map((name) => {
      const displayName = columnDisplayNames[name] ?? name
      const isSorted = name === sortColumn
      const prefix = isSorted ? (sortDirection === "asc" ? "▲ " : "▼ ") : ""
      
      return {
        title: prefix + displayName,
        id: name,
      }
    })
  }, [columns, columnDisplayNames, sortColumn, sortDirection])

  // --- LÓGICA DE ICONOS Y DATOS ---
  const columnVectors = React.useMemo(() => {
    if (!dataSource || typeof (dataSource as any).getChild !== "function") {
      return null
    }
    return columns.map((key) => (dataSource as any).getChild(key))
  }, [dataSource, columns])

  const [searchIndex, setSearchIndex] = React.useState<string[] | null>(null)
  const [isIndexing, setIsIndexing] = React.useState(false)
  const indexingTriggeredRef = React.useRef(false)

  // Default columns that can be searched
  const defaultSearchableColumns = React.useMemo(() => {
    const priority = ['id', 'Assembly ID', 'PTU cluster', 'Average Dice Dissimilarity', 'Plasmid length (bp)', 'Topology', 'Putative phage plasmid', 'Plasmid Copy Number', 'Replication type(s)', 'Relaxase type(s)', 'MPF type', 'oriT type(s)', 'Predicted mobility', 'Defense type (plasmid)', 'Defense subtype (plasmid)', 'Defense systems (plasmid)', 'PDC type', 'PDC systems', 'Anti-defense type (plasmid)', 'Anti-defense subtype (plasmid)', 'Anti-defense systems (plasmid)', 'AMR genes', 'MGE target (plasmid)', 'Host domain', 'Host phylum', 'Host class', 'Host order', 'Host family', 'Host genus', 'Host species', 'Host strain', 'Host chromosome length (bp)', 'Plasmids in host', 'Defense type (host)', 'Defense subtype (host)', 'Defense systems (host)', 'Anti-defense type (host)', 'Anti-defense subtype (host)', 'Anti-defense systems (host)', 'MGE target (host)', 'Ecosystem', 'Ecosystem category', 'Ecosystem type', 'Ecosystem subtype', 'Ecosystem specific', 'Infomap Cluster Level 1', 'Infomap Cluster Level 2', 'Infomap Cluster Level 3', 'Infomap Cluster Level 4', 'Infomap Cluster Level 5', 'Infomap Cluster Level 6', 'Infomap Cluster Level 7', 'Infomap Cluster Level 8']
    return columns.filter(col => priority.includes(col))
  }, [columns])

  // User-selected columns for search (defaults to all searchable columns)
  const [selectedSearchColumns, setSelectedSearchColumns] = React.useState<Set<string>>(new Set())
  const hasInitializedSearchColumns = React.useRef(false)

  // Initialize selected columns only once when defaults are available
  React.useEffect(() => {
    if (!hasInitializedSearchColumns.current && defaultSearchableColumns.length > 0) {
      setSelectedSearchColumns(new Set(defaultSearchableColumns))
      hasInitializedSearchColumns.current = true
    }
  }, [defaultSearchableColumns])

  // Columns actually used for search (only user-selected columns)
  const searchableColumns = React.useMemo(() => {
    return columns.filter(col => selectedSearchColumns.has(col))
  }, [columns, selectedSearchColumns])

  // Reset search index when selected columns change
  React.useEffect(() => {
    indexingTriggeredRef.current = false
    setSearchIndex(null)
  }, [selectedSearchColumns])

  
  const buildSearchIndex = React.useCallback(() => {
    if (indexingTriggeredRef.current || !dataSource || columns.length === 0) return
    indexingTriggeredRef.current = true
    setIsIndexing(true)

    const colsToIndex = searchableColumns.length > 0 ? searchableColumns : columns.slice(0, 10)
    const colIndices = colsToIndex.map(col => columns.indexOf(col)).filter(i => i >= 0)
    
    const values: string[] = Array.from({ length: totalRows }, () => "")
    const batchSize = 2000

    const fillRow = (row: number) => {
      const parts: string[] = []
      for (const colIndex of colIndices) {
        const key = columns[colIndex]
        let raw: unknown
        if (columnVectors) {
          raw = columnVectors[colIndex]?.get?.(row)
        } else if (Array.isArray(dataSource)) {
          raw = (dataSource as any[])[row]?.[key]
        } else if (typeof (dataSource as any).get === "function") {
          raw = (dataSource as any).get(row)?.[key]
        } else {
          raw = (dataSource as any)?.[row]?.[key]
        }
        if (raw === null || raw === undefined) continue
        parts.push(String(raw).toLowerCase())
      }
      values[row] = parts.join(" ")
    }

    const runBatch = (start: number) => {
      const end = Math.min(start + batchSize, totalRows)
      for (let row = start; row < end; row++) {
        fillRow(row)
      }
      if (end < totalRows) {
        requestAnimationFrame(() => runBatch(end))
      } else {
        setSearchIndex(values)
        setIsIndexing(false)
      }
    }

    runBatch(0)
  }, [dataSource, columns, columnVectors, totalRows, searchableColumns])

  
  React.useEffect(() => {
    indexingTriggeredRef.current = false
    setSearchIndex(null)
    setIsIndexing(false)
  }, [dataSource, columns])

  
  React.useEffect(() => {
    if (dataSource && columns.length > 0) {
      onIndexReady?.()
    }
  }, [dataSource, columns, onIndexReady])

  
  React.useEffect(() => {
    if (searchValue && searchValue.length > 0 && !searchIndex && !isIndexing) {
      buildSearchIndex()
    }
  }, [searchValue, searchIndex, isIndexing, buildSearchIndex])

  const searchFilteredRows = React.useMemo(() => {
    if (!searchValue) return null
    if (!searchIndex) return null 
    const needle = searchValue.toLowerCase()
    const matches: number[] = []
    for (let i = 0; i < searchIndex.length; i++) {
      if (searchIndex[i].includes(needle)) {
        matches.push(i)
      }
    }
    return matches
  }, [searchValue, searchIndex])

  
  
  const selectedRowSet = React.useMemo(() => {
    if (!effectiveSelectedRowIndices || effectiveSelectedRowIndices.length === 0) return null
    const set = new Set<number>()
    for (const row of effectiveSelectedRowIndices) {
      if (Number.isInteger(row) && row >= 0 && row < totalRows) {
        set.add(row)
      }
    }
    return set.size > 0 ? set : null
  }, [effectiveSelectedRowIndices, totalRows])

  
  const selectionFilterSet = React.useMemo(() => {
    if (!showOnlySelected) return null
    return selectedRowSet
  }, [showOnlySelected, selectedRowSet])

  const selectionFilteredRows = React.useMemo(() => {
    if (!selectionFilterSet || !effectiveSelectedRowIndices) return null
    return effectiveSelectedRowIndices
      .filter((row) => selectionFilterSet.has(row))
      .sort((a, b) => a - b)
  }, [selectionFilterSet, effectiveSelectedRowIndices])

  const filteredRowIndices = React.useMemo(() => {
    if (selectionFilterSet) {
      if (searchFilteredRows) {
        return searchFilteredRows.filter((row) => selectionFilterSet.has(row))
      }
      return selectionFilteredRows ?? []
    }
    if (showOnlySelected) {
      return []
    }
    return searchFilteredRows
  }, [searchFilteredRows, selectionFilteredRows, selectionFilterSet, showOnlySelected])

  // Apply sorting to the row indices
  const sortedRowIndices = React.useMemo(() => {
    // If no filtering, create indices for all rows
    const indices = filteredRowIndices !== null 
      ? [...filteredRowIndices]
      : Array.from({ length: totalRows }, (_, i) => i)
    
    if (!sortColumn || indices.length === 0) return indices

    const sortColIndex = columns.indexOf(sortColumn)
    if (sortColIndex < 0) return indices

    // Get values for sorting
    const getValue = (row: number): unknown => {
      if (columnVectors && columnVectors[sortColIndex]) {
        return columnVectors[sortColIndex]?.get?.(row)
      }
      if (Array.isArray(dataSource)) {
        return (dataSource as any[])[row]?.[sortColumn]
      }
      if (typeof (dataSource as any).get === "function") {
        return (dataSource as any).get(row)?.[sortColumn]
      }
      return (dataSource as any)?.[row]?.[sortColumn]
    }

    // Sort with proper comparison
    indices.sort((a, b) => {
      const valA = getValue(a)
      const valB = getValue(b)
      
      // Handle nulls/undefined
      if (valA == null && valB == null) return 0
      if (valA == null) return sortDirection === "asc" ? 1 : -1
      if (valB == null) return sortDirection === "asc" ? -1 : 1
      
      // Compare values
      let cmp: number
      if (typeof valA === "number" && typeof valB === "number") {
        cmp = valA - valB
      } else {
        cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: "base" })
      }
      
      return sortDirection === "asc" ? cmp : -cmp
    })
    
    return indices
  }, [filteredRowIndices, totalRows, sortColumn, sortDirection, columns, columnVectors, dataSource])

  const visibleRowCount =
    filteredRowIndices !== null
      ? filteredRowIndices.length
      : showOnlySelected
        ? 0
        : totalRows

  const rowCountLabel = (() => {
    const baseTotal = totalRows.toLocaleString()
    if (selectionFilterSet || showOnlySelected) {
      const selectedCount =
        selectionFilteredRows?.length ??
        selectionFilterSet?.size ??
        filteredRowIndices?.length ??
        0
      const visibleCount = visibleRowCount.toLocaleString()
      const selectedLabel = selectedCount.toLocaleString()
      return `${visibleCount} / ${selectedLabel} selected / ${baseTotal}`
    }
    if (filteredRowIndices && searchValue.length > 0) {
      return `${visibleRowCount.toLocaleString()} / ${baseTotal}`
    }
    return baseTotal
  })()

  // Map source row indices to their visual position in the sorted table
  // This is crucial for correctly highlighting/scrolling to rows when sorting is active
  const sortedRowLookup = React.useMemo(() => {
    if (!sortedRowIndices || sortedRowIndices.length === 0) return null
    const map = new Map<number, number>()
    sortedRowIndices.forEach((sourceIdx, visualIdx) => {
      map.set(sourceIdx, visualIdx)
    })
    return map
  }, [sortedRowIndices])

  
  React.useEffect(() => {
    if (!effectiveSelectedRowIndices || effectiveSelectedRowIndices.length === 0) {
      
      syncingFromExternalRef.current = true
      setGridSelection({
        columns: CompactSelection.empty(),
        rows: CompactSelection.empty(),
      })
      requestAnimationFrame(() => {
        syncingFromExternalRef.current = false
      })
      return
    }

    
    const visibleSelectedRows: number[] = []
    for (const sourceIdx of effectiveSelectedRowIndices) {
      let visibleIdx: number | undefined
      // Use sortedRowLookup to find the visual position in the sorted table
      if (sortedRowLookup && sortedRowLookup.size > 0) {
        visibleIdx = sortedRowLookup.get(sourceIdx)
      } else if (sortedRowIndices === null || sortedRowIndices.length === 0) {
        // No sorting, source index equals visual index
        visibleIdx = sourceIdx
      }
      if (visibleIdx !== undefined && visibleIdx >= 0 && visibleIdx < visibleRowCount) {
        visibleSelectedRows.push(visibleIdx)
      }
    }

    
    if (visibleSelectedRows.length > 0) {
      syncingFromExternalRef.current = true
      
      let rowsSelection = CompactSelection.empty()
      for (const idx of visibleSelectedRows) {
        rowsSelection = rowsSelection.add(idx)
      }
      setGridSelection({
        columns: CompactSelection.empty(),
        rows: rowsSelection,
      })
      requestAnimationFrame(() => {
        syncingFromExternalRef.current = false
      })
    }
  }, [effectiveSelectedRowIndices, sortedRowLookup, sortedRowIndices, visibleRowCount])

  const enrichedGridColumns = React.useMemo(() => {
    // Sample multiple rows to find max content width
    const SAMPLE_SIZE = Math.min(100, totalRows)
    const MIN_WIDTH = 80
    const MAX_WIDTH = 400
    const CHAR_WIDTH = 8 // Approximate character width in pixels
    const PADDING = 24 // Cell padding

    const getSampleValues = (colIndex: number, key: string): unknown[] => {
      if (!dataSource) return []
      const values: unknown[] = []
      
      // Sample evenly distributed rows
      for (let i = 0; i < SAMPLE_SIZE; i++) {
        const rowIdx = Math.floor((i / SAMPLE_SIZE) * totalRows)
        let value: unknown
        
        if (columnVectors && columnVectors[colIndex]) {
          value = columnVectors[colIndex]?.get?.(rowIdx)
        } else if (Array.isArray(dataSource)) {
          value = (dataSource as any[])[rowIdx]?.[key]
        } else if (typeof (dataSource as any).get === "function") {
          value = (dataSource as any).get(rowIdx)?.[key]
        } else {
          value = (dataSource as any)?.[rowIdx]?.[key]
        }
        
        if (value !== null && value !== undefined) {
          values.push(value)
        }
      }
      return values
    }

    const getAdaptiveWidth = (colName: string, samples: unknown[]): number => {
      const displayName = columnDisplayNames[colName] ?? colName
      // Header width: account for sort indicator and icon
      const headerWidth = displayName.length * CHAR_WIDTH + 50
      
      if (samples.length === 0) {
        return Math.max(MIN_WIDTH, Math.min(headerWidth, MAX_WIDTH))
      }

      // Find the maximum content width from samples
      let maxContentWidth = 0
      for (const value of samples) {
        const strValue = typeof value === 'bigint' ? value.toString() : String(value)
        const contentWidth = strValue.length * CHAR_WIDTH + PADDING
        if (contentWidth > maxContentWidth) {
          maxContentWidth = contentWidth
        }
      }

      // Use the larger of header width or max content width, clamped to bounds
      const idealWidth = Math.max(headerWidth, maxContentWidth)
      return Math.max(MIN_WIDTH, Math.min(idealWidth, MAX_WIDTH))
    }

    return gridColumns.map((col, index) => {
      const samples = getSampleValues(index, col.id)
      const firstSample = samples[0]
      let icon = GridColumnIcon.HeaderString
      
      if (typeof firstSample === 'number' || typeof firstSample === 'bigint') {
        icon = GridColumnIcon.HeaderNumber
      } else if (typeof firstSample === 'boolean') {
        icon = GridColumnIcon.HeaderBoolean
      } else if (typeof firstSample === 'string') {
        if (firstSample.startsWith('http://') || firstSample.startsWith('https://')) {
          icon = GridColumnIcon.HeaderUri
        }
      }

      return {
        ...col,
        icon,
        width: getAdaptiveWidth(col.id, samples),
      }
    })
  }, [gridColumns, dataSource, columnVectors, columnDisplayNames, totalRows])

  const getRawValue = React.useCallback(
    (sourceRow: number, colIndex: number, key: string) => {
      if (!key) return undefined

      if (columnVectors) {
        return columnVectors[colIndex]?.get?.(sourceRow)
      }
      if (Array.isArray(dataSource)) {
        const rowData = (dataSource as any[])[sourceRow]
        return rowData?.[key]
      }
      if (typeof (dataSource as any).get === "function") {
        const rowData = (dataSource as any).get(sourceRow)
        return rowData?.[key]
      }
      return (dataSource as any)?.[sourceRow]?.[key]
    },
    [columnVectors, dataSource]
  )

  const getCellContent = React.useCallback(
    (cell: readonly [number, number]): GridCell => {
      const [col, row] = cell

      const sourceRow =
        sortedRowIndices && sortedRowIndices.length > 0
          ? sortedRowIndices[row] ?? -1
          : row

      if (!dataSource || columns.length === 0 || sourceRow < 0 || sourceRow >= totalRows) {
        return {
          kind: GridCellKind.Text,
          data: "",
          displayData: "",
          allowOverlay: true,
          style: "normal",
        } satisfies TextCell
      }

      const key = columns[col]
      const value = getRawValue(sourceRow, col, key)

      const display =
        value === null || value === undefined
          ? ""
          : typeof value === "bigint"
            ? value.toString()
            : String(value)

      const needle = searchValue.trim().toLowerCase()
      const matchesSearch =
        needle.length > 0 && display.toLowerCase().includes(needle)

      
      const isSelected = selectedRowSet?.has(sourceRow) ?? false

      
      let highlightTheme: Partial<Theme> | undefined = undefined
      if (matchesSearch) {
        highlightTheme = {
          bgCell: isDark ? "rgba(56,189,248,0.16)" : "rgba(56,189,248,0.14)",
          bgCellMedium: isDark ? "rgba(56,189,248,0.16)" : "rgba(56,189,248,0.14)",
          textDark: isDark ? "#e0f2fe" : "#0f172a",
          textMedium: isDark ? "#e0f2fe" : "#0f172a",
        }
      } else if (isSelected) {
        highlightTheme = {
          bgCell: isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.12)",
          bgCellMedium: isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.12)",
        }
      }

      return {
        kind: GridCellKind.Text,
        data: display,
        displayData: display,
        allowOverlay: true,
        style: "normal",
        themeOverride: highlightTheme,
      } satisfies TextCell
    },
    [columns, sortedRowIndices, totalRows, searchValue, isDark, getRawValue, selectedRowSet, dataSource]
  )

  
  
  const editorKey = React.useMemo(
    () => `grid-${columns.length}-${totalRows}-${isDark ? "dark" : "light"}-${sortColumn}-${sortDirection}`,
    [columns.length, totalRows, isDark, sortColumn, sortDirection]
  )

  // Handle column header click for sorting
  const handleHeaderClicked = React.useCallback(
    (colIndex: number) => {
      const colName = columns[colIndex]
      if (!colName) return

      if (colName === sortColumn) {
        // Toggle direction if clicking same column
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        // Set new column with ascending direction
        setSortColumn(colName)
        setSortDirection("asc")
      }
    },
    [columns, sortColumn]
  )

  const theme = React.useMemo<Partial<Theme>>(() => {
    const base = getDefaultTheme()
    const textMain = isDark ? "#e2e8f0" : "#1e293b"
    const bgMain = isDark ? "#09090b" : "#ffffff"
    const border = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"

    return {
      ...base,
      fontFamily: '"Space Grotesk", "Helvetica Neue", "Segoe UI", sans-serif',
      bgCell: bgMain,
      bgCellMedium: bgMain,
      textDark: textMain,
      textMedium: textMain,
      textLight: textMain,
      textHeader: textMain,
      textHeaderSelected: textMain,
      bgHeader: isDark ? "#18181b" : "#f1f5f9",
      bgHeaderHasFocus: isDark ? "#27272a" : "#e2e8f0",
      bgHeaderHovered: isDark ? "#27272a" : "#e2e8f0",
      borderColor: border,
      accentColor: "#3b82f6",
      accentFg: "#ffffff",
      accentLight: "rgba(59, 130, 246, 0.1)",
      textHeaderIcon: isDark ? "#94a3b8" : "#64748b", 
      baseFontStyle: "13px",
      editorFontSize: "13px",
    }
  }, [isDark])

  
  const pendingFocusRef = React.useRef<number | null>(null)

  
  React.useEffect(() => {
    
    if (focusTrigger === 0) return
    if (focusRowIndex === null || focusRowIndex === undefined) return
    
    if (!open) {
      
      pendingFocusRef.current = focusRowIndex
      return
    }
    
    
    pendingFocusRef.current = null
    const timeoutId = setTimeout(() => {
      // Use sortedRowLookup to find the visual position in the sorted table
      let targetRow: number | undefined
      if (sortedRowLookup && sortedRowLookup.size > 0) {
        targetRow = sortedRowLookup.get(focusRowIndex)
      } else {
        targetRow = focusRowIndex
      }

      if (targetRow !== undefined && Number.isInteger(targetRow) && targetRow >= 0) {
        gridRef.current?.scrollTo(
          { amount: 0, unit: "cell" },
          { amount: targetRow, unit: "cell" },
          "both",
          0,
          8,
          { vAlign: "center" }
        )
      }
    }, 50)
    
    return () => clearTimeout(timeoutId)
  }, [focusTrigger, focusRowIndex, open, sortedRowLookup])

  
  React.useEffect(() => {
    if (!open) return
    if (pendingFocusRef.current === null) return
    
    const pending = pendingFocusRef.current
    pendingFocusRef.current = null
    
    const timeoutId = setTimeout(() => {
      // Use sortedRowLookup to find the visual position in the sorted table
      let targetRow: number | undefined
      if (sortedRowLookup && sortedRowLookup.size > 0) {
        targetRow = sortedRowLookup.get(pending)
      } else {
        targetRow = pending
      }

      if (targetRow !== undefined && Number.isInteger(targetRow) && targetRow >= 0) {
        gridRef.current?.scrollTo(
          { amount: 0, unit: "cell" },
          { amount: targetRow, unit: "cell" },
          "both",
          0,
          8,
          { vAlign: "center" }
        )
      }
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [open, sortedRowLookup])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.code === "KeyF") {
        event.preventDefault()
        event.stopPropagation()
        onOpen?.()
        const focusInput = () => searchInputRef.current?.focus()
        if (!open) {
          requestAnimationFrame(focusInput)
        } else {
          focusInput()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [onOpen, open])

  const handleGridSelectionChange = React.useCallback(
    (selection: GridSelection) => {
      
      setGridSelection(selection)
      
      
      if (syncingFromExternalRef.current) return
      
      if (!onRowSelectionChange) return

      const selectedVisibleRows = selection.rows.toArray()
      
      
      
      if (selectedVisibleRows.length === 0) {
        return
      }
      
      const selectedSourceRows = selectedVisibleRows
        .map((visibleRow) =>
          sortedRowIndices && sortedRowIndices.length > 0
            ? sortedRowIndices[visibleRow]
            : visibleRow
        )
        .filter((row) => Number.isInteger(row) && row >= 0 && row < totalRows)

      const next = Array.from(new Set(selectedSourceRows)).sort((a, b) => a - b)
      if (
        Array.isArray(selectedRowIndices) &&
        next.length === selectedRowIndices.length &&
        next.every((value, idx) => value === selectedRowIndices[idx])
      ) {
        return
      }

      onRowSelectionChange(next)
    },
    [sortedRowIndices, onRowSelectionChange, totalRows, selectedRowIndices]
  )

  const handleDownloadSelected = React.useCallback(() => {
    if (!columns.length || !selectedRowIndices || selectedRowIndices.length === 0) {
      return
    }

    const rows = selectedRowIndices
      .filter((row) => Number.isInteger(row) && row >= 0 && row < totalRows)
      .map((rowIndex) =>
        columns
          .map((key, colIndex) => {
            const raw = getRawValue(rowIndex, colIndex, key)
            if (raw === null || raw === undefined) return ""
            const str = typeof raw === "bigint" ? raw.toString() : String(raw)
            return str.replace(/[\t\r\n]+/g, " ").trim()
          })
          .join("\t")
      )

    if (rows.length === 0) return

    const header = columns.join("\t")
    const contents = [header, ...rows].join("\n")
    const blob = new Blob([contents], {
      type: "text/tab-separated-values;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "selected-nodes.tsv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [columns, selectedRowIndices, getRawValue, totalRows])

  return (
    <div
      className={`absolute inset-x-2 bottom-2 z-50 flex flex-col overflow-hidden rounded-xl border bg-card/95 shadow-xl backdrop-blur transition-opacity duration-250 ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      style={{ height: "50%" }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground bg-muted/20">
        <span>Nodes table</span>
        <div className="flex items-center gap-2 text-[0.7rem] font-normal normal-case">
          <span className="text-[0.6rem] uppercase opacity-70">
            {rowCountLabel} rows
          </span>
          <div 
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Switch
              id="show-only-selected"
              checked={showOnlySelected}
              onCheckedChange={onShowOnlySelectedChange}
              disabled={!selectedRowIndices || selectedRowIndices.length === 0}
              className="scale-75"
            />
            <label 
              htmlFor="show-only-selected" 
              className={`text-[0.65rem] cursor-pointer select-none ${
                !selectedRowIndices || selectedRowIndices.length === 0 
                  ? 'opacity-40' 
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Selected only
            </label>
          </div>
          <button
            className="rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/20 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-[0.5px] disabled:cursor-not-allowed disabled:border-muted disabled:text-muted-foreground disabled:hover:bg-background disabled:opacity-40"
            onClick={handleDownloadSelected}
            disabled={
              !selectedRowIndices || selectedRowIndices.length === 0 || columns.length === 0 || !dataSource
            }
          >
            Download TSV
          </button>
          <div className="flex items-center gap-1 rounded-md border bg-background/70 px-2 py-1 text-xs">
            <input
              className="h-6 w-32 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/70"
              placeholder="Search (Ctrl/Cmd+F)"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              ref={searchInputRef}
            />
            {searchValue.length > 0 ? (
              <button
                className="text-muted-foreground transition hover:text-foreground"
                onClick={() => {
                  setSearchValue("")
                }}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            ) : (
              <button
                className="text-muted-foreground transition hover:text-foreground"
                onClick={() => searchInputRef.current?.focus()}
                aria-label="Alternar búsqueda"
              >
                🔍
              </button>
              )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1 rounded-md border bg-background/70 px-2 py-1.5 text-xs text-muted-foreground transition hover:text-foreground hover:bg-background"
                aria-label="Filter search columns"
              >
                <IconFilter className="size-3.5" />
                <span className="hidden sm:inline">
                  Search in {selectedSearchColumns.size} column{selectedSearchColumns.size !== 1 ? 's' : ''}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              <div className="flex gap-1 px-2 py-1.5">
                <button
                  type="button"
                  className="flex-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedSearchColumns(new Set(defaultSearchableColumns))
                  }}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="flex-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedSearchColumns(new Set())
                  }}
                >
                  Deselect all
                </button>
              </div>
              <DropdownMenuSeparator />
              {defaultSearchableColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={selectedSearchColumns.has(col)}
                  onCheckedChange={(checked) => {
                    setSelectedSearchColumns((prev) => {
                      const next = new Set(prev)
                      if (checked) {
                        next.add(col)
                      } else {
                        next.delete(col)
                      }
                      return next
                    })
                  }}
                  onSelect={(e) => e.preventDefault()}
                  className="text-xs"
                >
                  {columnDisplayNames[col] ?? col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 w-full gdg-wrapper">
        {totalRows === 0 || !dataSource ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        ) : (
          <DataEditor
            key={editorKey}
            className="h-full w-full"
            ref={gridRef}
            columns={enrichedGridColumns}
            getCellContent={getCellContent}
            rows={visibleRowCount}
            smoothScrollX={true}
            smoothScrollY={true}
            theme={theme}
            headerHeight={36}
            rowHeight={32}
            searchValue={searchValue}
            onSearchValueChange={setSearchValue}
            searchResults={[]}
            getCellsForSelection={true}
            
            
            gridSelection={gridSelection}
            onGridSelectionChange={handleGridSelectionChange}
            rowSelect="multi"
            rowSelectionMode="multi"
            rowMarkers={{
              kind: "both",
              checkboxStyle: "circle",
            }}
            
            headerIcons={undefined}
            onHeaderClicked={handleHeaderClicked}
          />
        )}
      </div>
    </div>
  )
}

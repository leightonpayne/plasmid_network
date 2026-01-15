declare module 'dicopal' {
  export type PaletteType = 'sequential' | 'diverging' | 'qualitative';

  export interface Palette {
    id: string;
    name: string;
    number: number;
    type: PaletteType;
    colors: string[];
    provider: string;
    url: string;
    cbf?: boolean;
  }

  export function getSequentialColors(
    palette: string,
    count: number,
    reverse?: boolean
  ): string[] | undefined;
  
  export function getDivergingColors(
    palette: string,
    count: number,
    reverse?: boolean
  ): string[] | undefined;
  
  export function getQualitativeColors(
    palette: string,
    count: number,
    reverse?: boolean
  ): string[] | undefined;

  export function getPalettes(options?: {
    type?: string;
    number?: number;
    provider?: string;
    name?: string;
  }): Palette[];

  export function getPalette(name: string, number: number): Palette | undefined;
}

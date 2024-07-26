"use client";

import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import chakraTheme from "./theme";
import muiTheme from "./mui-theme";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <>
            <ColorModeScript initialColorMode={chakraTheme.config.initialColorMode} />
            <ChakraProvider theme={chakraTheme}>
                <MUIThemeProvider theme={muiTheme}>
                    {children}
                </MUIThemeProvider>
            </ChakraProvider>
        </>
    );
}
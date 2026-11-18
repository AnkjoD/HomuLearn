import { alpha, createTheme } from "@mui/material/styles";

export function createLearningTheme(mode) {
  const isDark = mode === "dark";
  const primaryColor = isDark ? "#C5A8EB" : "#AD3E69";
  const textColor = isDark ? "#F2EBF7" : "#46313D";
  const mutedTextColor = isDark ? "#B8AABE" : "#816B77";
  const borderColor = isDark ? "#44364F" : "#ECDCE3";
  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryColor,
        contrastText: isDark ? "#211529" : "#FFFFFF",
      },
      secondary: {
        main: isDark ? "#EC9DAE" : "#9B762D",
        contrastText: isDark ? "#30141F" : "#FFFFFF",
      },
      background: {
        default: isDark ? "#141019" : "#FCF7F8",
        paper: isDark ? "#211A29" : "#FFFCFD",
        subtle: isDark ? "#2D2336" : "#F7EBF0",
      },
      text: {
        primary: textColor,
        secondary: mutedTextColor,
        disabled: isDark ? "#A292AE" : "#8D7783",
      },
      divider: borderColor,
      success: { main: isDark ? "#8DCEB4" : "#347557" },
      warning: { main: isDark ? "#E6C982" : "#946B25" },
      error: { main: isDark ? "#F19CAE" : "#BD3C58" },
      info: { main: isDark ? "#B5BAEF" : "#666AA6" },
    },
    typography: {
      fontFamily: '"Be Vietnam Pro", "Segoe UI", sans-serif',
      fontSize: 14,
      h1: { fontSize: "3.4rem", fontWeight: 700, letterSpacing: "-0.05em" },
      h2: { fontSize: "2.4rem", fontWeight: 700, letterSpacing: "-0.04em" },
      h3: { fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.03em" },
      h4: {
        fontSize: "1.65rem",
        fontWeight: 700,
        letterSpacing: "-0.035em",
        lineHeight: 1.5,
      },
      h5: { fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.6 },
      h6: { fontSize: "0.95rem", fontWeight: 600, lineHeight: 1.6 },
      body1: { fontSize: "0.94rem", lineHeight: 1.8 },
      body2: { fontSize: "0.84rem", lineHeight: 1.75 },
      caption: { fontSize: "0.73rem", lineHeight: 1.7 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: 14 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            colorScheme: mode,
            backgroundImage: `radial-gradient(ellipse at 80% 0%, ${alpha(primaryColor, 0.06)}, transparent 55%)`,
          },
          "*": {
            scrollbarWidth: "thin",
            scrollbarColor: `${borderColor} transparent`,
          },
          "*:focus-visible": {
            outline: `3px solid ${primaryColor}`,
            outlineOffset: 3,
          },
          "::selection": { background: alpha(primaryColor, 0.25) },
          "@keyframes pageEnter": {
            from: { opacity: 0, transform: "translateY(8px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animation: "none !important",
              transition: "none !important",
              scrollBehavior: "auto !important",
            },
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${borderColor}`,
            borderRadius: 20,
            backgroundImage: "none",
            boxShadow: isDark ? "0 4px 24px #00000012" : "0 4px 24px #69374b05",
            transition: "border-color 180ms, box-shadow 180ms",
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: 24, "&:last-child": { paddingBottom: 24 } },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 12, padding: "9px 17px" },
          outlined: { borderColor },
          sizeSmall: { padding: "5px 11px" },
        },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } },
      },
      MuiTextField: { defaultProps: { size: "small" } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 12, "& fieldset": { borderColor } },
        },
      },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 24, border: `1px solid ${borderColor}` },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 7,
            borderRadius: 8,
            backgroundColor: alpha(primaryColor, 0.12),
          },
          bar: { borderRadius: 8 },
        },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
      },
      MuiTableCell: { styleOverrides: { root: { borderColor } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 12 } } },
    },
  });
}

export const lightTheme = createLearningTheme("light");
export const darkTheme = createLearningTheme("dark");

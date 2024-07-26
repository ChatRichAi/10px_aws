import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  spacing: (factor: number) => `${0.25 * factor}rem`,
  // 在这里添加其他主题配置
});

export default theme;
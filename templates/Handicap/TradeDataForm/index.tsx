import React, { useState, useEffect, memo } from 'react';
import { Container, TextField, Button, Select, MenuItem, FormControl, InputLabel, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Grid, Chip, ToggleButton, ToggleButtonGroup, Fab, Box, Skeleton, LinearProgress } from '@mui/material';
import RobotIcon from '@mui/icons-material/SmartToy';
import useTradeData from '@/components/useTradeData';

const TradeRow = memo(({ trade, marketType, index }) => (
    <TableRow>
        <TableCell>{new Date(trade.timestamp).toLocaleString('zh-CN', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</TableCell>
        <TableCell>{trade.symbol}</TableCell>
        <TableCell>{trade.price}</TableCell>
        <TableCell>
            {trade.quantity > 10 && (
                <span style={{ color: 'green' }}>●</span>
            )}
            {trade.quantity}
        </TableCell>
        <TableCell>
            <Chip
                label={trade.order_type === 'B' ? <strong>Buy-{index + 1}</strong> : <strong>Sell-{index + 1}</strong>}
                style={{
                    backgroundColor: trade.order_type === 'B' ? 'green' : 'red',
                    color: 'white'
                }}
            />
        </TableCell>
        <TableCell>{marketType === 'spot' ? '现货' : '合约'}</TableCell>
    </TableRow>
));

const TradeDataForm = () => {
    const {
        trades,
        startTime,
        setStartTime,
        endTime,
        setEndTime,
        symbol,
        setSymbol,
        marketType,
        setMarketType,
        isRealTime,
        setIsRealTime,
        fetchTrades,
        exportTrades,
        dataType,
        setDataType
    } = useTradeData();

    const [exportLoading, setExportLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [realTimeLoading, setRealTimeLoading] = useState(false);

    useEffect(() => {
        if (isRealTime) {
            setRealTimeLoading(true);
            const timer = setTimeout(() => {
                setRealTimeLoading(false);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isRealTime]);

    const handleClickOpen = () => {
        setOpen(true);
        console.log('Dialog Opened:', true);
    };

    const handleExportTrades = async () => {
        setExportLoading(true);
        await new Promise(resolve => setTimeout(resolve, 5000));
        await exportTrades();
        setExportLoading(false);
    };

    const handleFetchTrades = async () => {
        setFetchLoading(true);
        await new Promise(resolve => setTimeout(resolve, 3000));
        await fetchTrades(false, dataType);
        setFetchLoading(false);
    };

    const handleRealTimeToggle = async (event) => {
        setIsRealTime(event.target.checked);
    };

    const buyTrades = trades.filter(trade => trade.order_type === 'B');
    const sellTrades = trades.filter(trade => trade.order_type === 'S');

    const renderSkeletonForm = () => (
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
                <Skeleton variant="rectangular" height={56} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Skeleton variant="rectangular" height={56} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
                <Skeleton variant="rectangular" height={56} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
                <Skeleton variant="rectangular" height={56} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
                <Skeleton variant="rectangular" height={40} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
                <Skeleton variant="rectangular" height={36} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
                <Skeleton variant="rectangular" height={36} />
            </Grid>
        </Grid>
    );

    return (
        <Container>
            {(fetchLoading || realTimeLoading) ? renderSkeletonForm() : (
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth margin="normal">
                            <TextField
                                label="开始时间"
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth margin="normal">
                            <TextField
                                label="结束时间"
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth margin="normal" variant="outlined">
                            <InputLabel shrink={symbol !== ''}>交易对</InputLabel>
                            <Select
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                label="交易对"
                                displayEmpty
                            >
                                <MenuItem value="btcusdt">BTCUSDT</MenuItem>
                                <MenuItem value="btcusdt_perp">BTCUSDT_PERP</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth margin="normal" variant="outlined">
                            <InputLabel shrink={marketType !== ''}>市场类型</InputLabel>
                            <Select
                                value={marketType}
                                onChange={(e) => setMarketType(e.target.value)}
                                label="市场类型"
                                displayEmpty
                            >
                                <MenuItem value="spot">现货</MenuItem>
                                <MenuItem value="perp">合约</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <ToggleButtonGroup
                            value={dataType}
                            exclusive
                            onChange={(e, newDataType) => setDataType(newDataType)}
                            aria-label="data type"
                        >
                            <ToggleButton value="orderbook" aria-label="order book">
                                订单簿
                            </ToggleButton>
                            <ToggleButton value="trades" aria-label="trades">
                                实时成交
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleFetchTrades}
                            disabled={fetchLoading}
                            fullWidth
                        >
                            {fetchLoading ? <CircularProgress size={24} /> : '获取数据'}
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Button
                            variant="contained"
                            style={{ backgroundColor: '#000000', color: 'while' }} // 修改这里
                            onClick={handleExportTrades}
                            disabled={exportLoading}
                            fullWidth
                        >
                            {exportLoading ? <CircularProgress size={24} /> : '导出数据'}
                        </Button>
                    </Grid>
                </Grid>
            )}
            <Grid item xs={12}>
                {realTimeLoading && (
                    <Box display="flex" alignItems="center">
                        <Box width="100%" mr={1}>
                            <LinearProgress />
                        </Box>
                        <Box minWidth={35}>
                            <Typography variant="body2" color="textSecondary">加载中...</Typography>
                        </Box>
                    </Box>
                )}
            </Grid>
            <Grid container spacing={2} style={{ marginTop: '20px' }}>
                <Grid item xs={12} md={6}>
                    <TableContainer component={Paper} style={{ marginTop: '10px' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>时间</TableCell>
                                    <TableCell>标的</TableCell>
                                    <TableCell>价格</TableCell>
                                    <TableCell>数量</TableCell>
                                    <TableCell>多空</TableCell>
                                    <TableCell>订单类型</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(fetchLoading || realTimeLoading) ? (
                                    Array.from(new Array(20)).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton animation="wave" /></TableCell>
                                            <TableCell><Skeleton animation="wave" /></TableCell>
                                            <TableCell><Skeleton animation="wave" /></TableCell>
                                            <TableCell><Skeleton animation="wave" /></TableCell>
                                            <TableCell><Skeleton animation="wave" width={60} height={30} /></TableCell>
                                            <TableCell><Skeleton animation="wave" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    buyTrades.map((trade, index) => (
                                        <TradeRow key={index} trade={trade} marketType={marketType} index={index} />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TableContainer component={Paper} style={{ marginTop: '10px' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>时间</TableCell>
                                    <TableCell>标的</TableCell>
                                    <TableCell>价格</TableCell>
                                    <TableCell>数量</TableCell>
                                    <TableCell>多空</TableCell>
                                    <TableCell>订单类型</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(fetchLoading || realTimeLoading) ? (
                                    Array.from(new Array(20)).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton animation="wave" /></TableCell>
                                            <TableCell><Skeleton animation="wave" /></TableCell>
                                            <TableCell><Skeleton animation="wave" /></TableCell>
                                            <TableCell><Skeleton animation="wave" /></TableCell>
                                            <TableCell><Skeleton animation="wave" width={60} height={30} /></TableCell>
                                            <TableCell><Skeleton animation="wave" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    sellTrades.map((trade, index) => (
                                        <TradeRow key={index} trade={trade} marketType={marketType} index={index} />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
            <Fab
                color="primary"
                aria-label="add"
                onClick={handleClickOpen}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000
                }}
            >
                <RobotIcon />
            </Fab>
        </Container>
    );
};

export default TradeDataForm;
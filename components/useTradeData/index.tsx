import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Trade {
    timestamp: number;
    symbol: string;
    price: number;
    quantity: number;
    order_type: string;
    market_type: string;
}

const useTradeData = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [symbol, setSymbol] = useState<string>('btcusdt');
    const [marketType, setMarketType] = useState<string>('spot');
    const [isRealTime, setIsRealTime] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [dataType, setDataType] = useState<string>('trades');
    const [ws, setWs] = useState<WebSocket | null>(null);

    const filterTrades = useCallback((data: Trade[]) => {
        return data.filter(trade => trade.quantity > 0.5).slice(0, 100);
    }, []);

    const fetchTrades = useCallback(async (isRealTime: boolean, dataType: string) => {
        setLoading(true);
        try {
            const response = await axios.get('http://34.84.118.234:5003/get-data', {
                params: {
                    start_time: startTime,
                    end_time: endTime,
                    symbol: symbol,
                    market_type: marketType,
                    data_type: dataType
                }
            });
            console.log('Fetched data:', response.data);
            setTrades(filterTrades(response.data));
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('获取数据时出错，请稍后再试。');
        } finally {
            setLoading(false);
        }
    }, [startTime, endTime, symbol, marketType, filterTrades]);

    const fetchLatestTrades = useCallback(async (dataType: string) => {
        setLoading(true);
        try {
            const response = await axios.get('http://34.84.118.234:5003/get-latest-orderbook', {
                params: {
                    market_type: marketType,
                    data_type: dataType
                }
            });
            console.log('Latest data:', response.data);
            setTrades(prevTrades => {
                const updatedTrades = [...filterTrades(response.data), ...prevTrades].slice(0, 100);
                return updatedTrades;
            });
        } catch (error) {
            console.error('Error fetching latest data:', error);
            alert('获取最新数据时出错，请稍后再试。');
        } finally {
            setLoading(false);
        }
    }, [marketType, filterTrades]);

    const exportTrades = async () => {
        try {
            const response = await axios.get('http://34.84.118.234:5003/export-data', {
                params: {
                    start_time: startTime,
                    end_time: endTime,
                    symbol: symbol,
                    market_type: marketType,
                    data_type: dataType
                },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${dataType}.csv`);
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('导出数据时出错，请稍后再试。');
        }
    };

    useEffect(() => {
        if (isRealTime) {
            const socket = new WebSocket('ws://34.84.118.234:5003/socket.io/?EIO=3&transport=websocket');
            socket.onopen = () => {
                console.log('WebSocket连接已打开');
                socket.send(JSON.stringify({
                    type: 'subscribe',
                    symbol: symbol,
                    market_type: marketType,
                    data_type: dataType
                }));
            };
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                setTrades(prevTrades => {
                    const updatedTrades = [...filterTrades(data), ...prevTrades].slice(0, 100);
                    return updatedTrades;
                });
            };
            socket.onerror = (error) => {
                console.error('WebSocket错误:', error);
            };
            socket.onclose = () => {
                console.log('WebSocket连接已关闭');
            };
            setWs(socket);

            return () => {
                socket.close();
            };
        } else {
            setTrades([]);
            if (ws) {
                ws.close();
            }
        }
    }, [isRealTime, marketType, symbol, dataType, filterTrades, ws]);

    useEffect(() => {
        if (!isRealTime && startTime && endTime) {
            fetchTrades(false, dataType);
        }
    }, [startTime, endTime, symbol, marketType, isRealTime, fetchTrades, dataType]);

    return {
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
        loading,
        dataType,
        setDataType
    };
};

export default useTradeData;

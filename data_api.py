from flask import Flask, jsonify, request, send_file
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import pandas as pd
import pymysql
from flask_cors import CORS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
import os
import tempfile
from flask_socketio import SocketIO, emit
import logging

app = Flask(__name__)

# 启用CORS，允许跨域请求
CORS(app)

# 配置数据库连接
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://yishen:yishen0428@localhost/binance'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 使用SQLAlchemy的连接池配置
engine = create_engine('mysql+pymysql://yishen:yishen0428@localhost/binance', pool_size=20, max_overflow=30, pool_timeout=30, pool_recycle=1800)
Session = scoped_session(sessionmaker(bind=engine))
db = SQLAlchemy(app, session_options={"autocommit": False, "autoflush": False, "bind": engine})

# 初始化SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# 设置日志记录
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 定义数据库模型，用于保存盘口数据
class OrderBook(db.Model):
    __tablename__ = 'order_book'
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(50), nullable=False, index=True)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, index=True)
    order_type = db.Column(db.String(4), nullable=True)
    market_type = db.Column(db.String(10), nullable=False, index=True)

# 定义数据库模型，用于保存成交数据
class Trade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    order_type = db.Column(db.String(1), nullable=False)  # 'B' for buy, 'S' for sell
    market_type = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# 数据验证和清洗函数
def validate_and_clean_data(orders):
    cleaned_orders = []
    for order in orders:
        if 1000 < order.price < 100000 and 0 < order.quantity < 10000:  # 假设合理的价格和数量范围
            cleaned_orders.append(order)
    return cleaned_orders

# 提供API接口来根据时间区间调取数据
@app.route('/get-data', methods=['GET'])
def get_data():
    session = Session()
    try:
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')
        symbol = request.args.get('symbol')
        market_type = request.args.get('market_type')
        data_type = request.args.get('data_type')
        logger.info(f"Received request with start_time: {start_time}, end_time: {end_time}, symbol: {symbol}, market_type: {market_type}, data_type: {data_type}")
        
        start_time = datetime.strptime(start_time, '%Y-%m-%dT%H:%M')
        end_time = datetime.strptime(end_time, '%Y-%m-%dT%H:%M')
        
        logger.info(f"Parsed start_time: {start_time}, end_time: {end_time}")
        
        if data_type == 'orderbook':
            query = session.query(OrderBook).filter(
                OrderBook.timestamp >= start_time,
                OrderBook.timestamp <= end_time,
                OrderBook.symbol == symbol,
                OrderBook.market_type == market_type,
                OrderBook.quantity > 0.5
            )
        elif data_type == 'trades':
            query = session.query(Trade).filter(
                Trade.timestamp >= start_time,
                Trade.timestamp <= end_time,
                Trade.symbol == symbol,
                Trade.market_type == market_type,
                Trade.quantity > 0.5
            )
        else:
            return jsonify({'error': 'Invalid data_type'}), 400
        
        logger.info(f"SQL Query: {str(query)}")
        orders = query.all()
        logger.info(f"Query result: {orders}")
        
        # 数据验证和清洗
        cleaned_orders = validate_and_clean_data(orders)
        
        result = [{
            'symbol': order.symbol,
            'price': order.price,
            'quantity': order.quantity,
            'order_type': order.order_type,
            'timestamp': order.timestamp.isoformat(),
            'market_type': order.market_type
        } for order in cleaned_orders]
        
        logger.info(f"Returning result: {result}")
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

# 提供API接口来获取最新的前100条买卖盘数据
@app.route('/get-latest-orderbook', methods=['GET'])
def get_latest_orderbook():
    session = Session()
    try:
        depth = int(request.args.get('depth', 100))
        merge_depth = int(request.args.get('merge_depth', 0))
        market_type = request.args.get('market_type')
        data_type = request.args.get('data_type')
        symbol = request.args.get('symbol')  # 添加symbol参数
        
        if data_type == 'orderbook':
            orders = session.query(OrderBook).filter(
                OrderBook.market_type == market_type,
                OrderBook.symbol == symbol,  # 添加symbol过滤
                OrderBook.quantity > 0.5
            ).order_by(OrderBook.timestamp.desc()).limit(depth).all()
        elif data_type == 'trades':
            orders = session.query(Trade).filter(
                Trade.market_type == market_type,
                Trade.symbol == symbol,  # 添加symbol过滤
                Trade.quantity > 0.5
            ).order_by(Trade.timestamp.desc()).limit(depth).all()
        else:
            return jsonify({'error': 'Invalid data_type'}), 400
        
        # 数据验证和清洗
        cleaned_orders = validate_and_clean_data(orders)
        
        merged_orderbook = [{
            'symbol': order.symbol,
            'price': round(order.price, merge_depth),
            'quantity': order.quantity,
            'order_type': order.order_type,
            'timestamp': order.timestamp.isoformat(),
            'market_type': order.market_type
        } for order in cleaned_orders]
        
        return jsonify(merged_orderbook)
    except ValueError as ve:
        logger.error(f"ValueError: {ve}")
        return jsonify({'error': 'Invalid depth or merge_depth'}), 400
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

# 提供API接口来导出数据
@app.route('/export-data', methods=['GET'])
def export_data():
    session = Session()
    try:
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')
        symbol = request.args.get('symbol')
        market_type = request.args.get('market_type')
        data_type = request.args.get('data_type')

        start_time = datetime.strptime(start_time, '%Y-%m-%dT%H:%M')
        end_time = datetime.strptime(end_time, '%Y-%m-%dT%H:%M')

        if data_type == 'orderbook':
            query = session.query(OrderBook).filter(
                OrderBook.timestamp >= start_time,
                OrderBook.timestamp <= end_time,
                OrderBook.symbol == symbol,
                OrderBook.market_type == market_type
            )
        elif data_type == 'trades':
            query = session.query(Trade).filter(
                Trade.timestamp >= start_time,
                Trade.timestamp <= end_time,
                Trade.symbol == symbol,
                Trade.market_type == market_type
            )
        else:
            return jsonify({'error': 'Invalid data_type'}), 400

        orders = query.all()

        df = pd.DataFrame([{
            'symbol': order.symbol,
            'price': order.price,
            'quantity': order.quantity,
            'order_type': order.order_type,
            'timestamp': order.timestamp,
            'market_type': order.market_type
        } for order in orders])

        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as temp_file:
            df.to_csv(temp_file.name, index=False)
            temp_file_path = temp_file.name

        return send_file(temp_file_path, as_attachment=True, download_name=f'{data_type}.csv', mimetype='text/csv')
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
        if 'temp_file_path' in locals():
            os.unlink(temp_file_path)

# WebSocket 事件处理
@socketio.on('subscribe')
def handle_subscribe(data):
    symbol = data.get('symbol')
    market_type = data.get('market_type')
    data_type = data.get('data_type')
    sid = request.sid
    logger.info(f"WebSocket 订阅: symbol={symbol}, market_type={market_type}, data_type={data_type}, sid={sid}")

    # 模拟推送数据
    def send_data():
        while True:
            try:
                session = Session()
                if data_type == 'orderbook':
                    orders = session.query(OrderBook).filter(
                        OrderBook.symbol == symbol,
                        OrderBook.market_type == market_type,
                        OrderBook.quantity > 0.5
                    ).order_by(OrderBook.timestamp.desc()).limit(100).all()
                elif data_type == 'trades':
                    orders = session.query(Trade).filter(
                        Trade.symbol == symbol,
                        Trade.market_type == market_type,
                        Trade.quantity > 0.5
                    ).order_by(Trade.timestamp.desc()).limit(100).all()
                
                cleaned_orders = validate_and_clean_data(orders)
                result = [{
                    'symbol': order.symbol,
                    'price': order.price,
                    'quantity': order.quantity,
                    'order_type': order.order_type,
                    'timestamp': order.timestamp.isoformat(),
                    'market_type': order.market_type
                } for order in cleaned_orders]
                emit('data', result, room=sid)
            except Exception as e:
                logger.error(f"Error in send_data: {e}")
            finally:
                session.close()
            socketio.sleep(1)

    socketio.start_background_task(send_data)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5003)

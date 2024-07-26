"use client";

import Layout from "@/components/Layout";
import TotalBalance from "./TotalBalance";
import BestToBuy from "./BestToBuy";
import TradeDataForm from "./TradeDataForm"; // 导入 TradeDataForm 组件

const HandicapPage = () => {
    return (
        <Layout title="Handicap Page">
            <div className="space-y-2">
                <div className="flex lg:block">
                    <TotalBalance />
                    <BestToBuy />
                </div>
                <div className="bg-white rounded-lg p-4">
                    <TradeDataForm />
                </div>
            </div>
        </Layout>
    );
};

export default HandicapPage;
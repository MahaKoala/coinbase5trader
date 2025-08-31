import { useState, useEffect } from "react";
import { Header } from "@/components/trading/Header";
import { ApiKeyDialog } from "@/components/trading/ApiKeyDialog";
import { TradeConfigCard } from "@/components/trading/TradeConfigCard";
import { ActiveTradesCard } from "@/components/trading/ActiveTradesCard";
import { useToast } from "@/hooks/use-toast";
import { CoinbaseCredentials, getCryptoPrice, placeOrder } from "@/lib/coinbase-api";

interface Trade {
  id: string;
  crypto: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  takeProfitPercent: number;
  trailingEnabled: boolean;
  status: 'active' | 'filled' | 'cancelled';
  timestamp: Date;
}

interface TradeConfig {
  crypto: string;
  amount: string;
  takeProfitPercent: string;
  enableTrailing: boolean;
  trailingPercent: string;
}

const Index = () => {
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [apiCredentials, setApiCredentials] = useState<CoinbaseCredentials | null>(null);
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [realTimePrices, setRealTimePrices] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const handleApiKeySet = (keyName: string, privateKey: string) => {
    setApiCredentials({ keyName, privateKey });
    setIsApiConnected(true);
  };

  // Fetch real-time prices for active trades
  useEffect(() => {
    if (!apiCredentials || activeTrades.length === 0) return;

    const fetchPrices = async () => {
      const uniqueProducts = [...new Set(activeTrades.map(trade => trade.crypto))];
      
      for (const productId of uniqueProducts) {
        try {
          const { price } = await getCryptoPrice(apiCredentials, productId);
          setRealTimePrices(prev => ({ ...prev, [productId]: price }));
          
          // Update trade current prices
          setActiveTrades(prev => prev.map(trade => 
            trade.crypto === productId 
              ? { ...trade, currentPrice: price }
              : trade
          ));
        } catch (error) {
          console.error(`Failed to fetch price for ${productId}:`, error);
        }
      }
    };

    // Fetch immediately and then every 30 seconds
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);

    return () => clearInterval(interval);
  }, [apiCredentials, activeTrades.length]);

  const handleCreateTrade = async (config: TradeConfig) => {
    if (!apiCredentials) {
      toast({
        title: "API Not Connected",
        description: "Please configure your API keys first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get current market price
      const { price: currentPrice } = await getCryptoPrice(apiCredentials, config.crypto);
      
      // Create the trade order
      const orderResult = await placeOrder(apiCredentials, {
        productId: config.crypto,
        side: 'BUY',
        orderType: 'MARKET',
        amount: config.amount
      });

      const newTrade: Trade = {
        id: orderResult.order_id || Date.now().toString(),
        crypto: config.crypto,
        amount: parseFloat(config.amount),
        entryPrice: currentPrice,
        currentPrice: currentPrice,
        takeProfitPercent: parseFloat(config.takeProfitPercent),
        trailingEnabled: config.enableTrailing,
        status: 'active',
        timestamp: new Date(),
      };

      setActiveTrades(prev => [...prev, newTrade]);
      toast({
        title: "Trade Created Successfully",
        description: `Bought $${config.amount} of ${config.crypto.replace('-USD', '')} at $${currentPrice.toFixed(2)}`,
      });

    } catch (error) {
      console.error('Failed to create trade:', error);
      toast({
        title: "Trade Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create trade order",
        variant: "destructive",
      });
    }
  };

  const handleCancelTrade = (tradeId: string) => {
    setActiveTrades(prev => prev.filter(trade => trade.id !== tradeId));
    toast({
      title: "Trade Cancelled",
      description: "Trade has been successfully cancelled",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onSettingsClick={() => setIsApiDialogOpen(true)}
        isApiConnected={isApiConnected}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TradeConfigCard 
            onCreateTrade={handleCreateTrade}
            disabled={!isApiConnected}
          />
          <ActiveTradesCard 
            trades={activeTrades}
            onCancelTrade={handleCancelTrade}
          />
        </div>
      </main>

      <ApiKeyDialog
        open={isApiDialogOpen}
        onOpenChange={setIsApiDialogOpen}
        onApiKeySet={handleApiKeySet}
      />
    </div>
  );
};

export default Index;

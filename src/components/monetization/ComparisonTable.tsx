import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown } from 'lucide-react';
import Link from 'next/link';

export function ComparisonTable() {
  const features = [
    {
      feature: 'Consensus picks',
      free: 'Top 5 only',
      pro: 'Unlimited',
      freeIcon: 'limited'
    },
    {
      feature: 'Individual capper picks',
      free: false,
      pro: '200+ cappers',
      freeIcon: 'x'
    },
    {
      feature: 'Win rate grades',
      free: false,
      pro: 'Full grades & ROI',
      freeIcon: 'x'
    },
    {
      feature: 'Early morning picks',
      free: false,
      pro: 'Before lines move',
      freeIcon: 'x'
    },
    {
      feature: 'Discord community',
      free: false,
      pro: 'Premium access',
      freeIcon: 'x'
    },
    {
      feature: 'Historical data',
      free: false,
      pro: '30-day archive',
      freeIcon: 'x'
    }
  ];

  return (
    <Card className="mt-8">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Free vs Pro Comparison</CardTitle>
        <p className="text-muted-foreground text-sm">
          See what you&apos;re missing with the free version
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium">Feature</th>
                <th className="text-center py-3 px-2">
                  <Badge variant="secondary" className="text-xs">
                    Free
                  </Badge>
                </th>
                <th className="text-center py-3 px-2">
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Pro
                  </Badge>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((item, index) => (
                <tr 
                  key={index} 
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-4 px-2 font-medium text-sm">
                    {item.feature}
                  </td>
                  <td className="text-center py-4 px-2">
                    {item.freeIcon === 'x' ? (
                      <X className="h-4 w-4 text-muted-foreground mx-auto" />
                    ) : item.freeIcon === 'limited' ? (
                      <span className="text-xs text-muted-foreground">{item.free}</span>
                    ) : (
                      <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                    )}
                  </td>
                  <td className="text-center py-4 px-2">
                    <div className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-emerald-400 font-medium">
                        {item.pro}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* CTA at bottom */}
        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Ready to upgrade your betting strategy?
          </p>
          <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
            <Link href="https://thehiddenbag.com" target="_blank" rel="noopener noreferrer">
              <Crown className="h-4 w-4 mr-2" />
              Get HiddenBag Pro
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
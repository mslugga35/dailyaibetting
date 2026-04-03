'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Menu,
  TrendingUp,
  Calendar,
  Target,
  ChevronDown,
  Zap,
  BarChart3,
  Brain,
  Crown,
  LogOut,
  User,
} from 'lucide-react';
import { useSubscription } from '@/lib/hooks/use-subscription';
import { createClient } from '@/lib/supabase/client';

const sports = [
  { name: 'NFL', href: '/nfl-picks-today' },
  { name: 'NBA', href: '/nba-picks-today' },
  { name: 'MLB', href: '/mlb-picks-today' },
  { name: 'NHL', href: '/nhl-picks-today' },
  { name: 'CFB', href: '/cfb-picks-today' },
  { name: 'CBB', href: '/cbb-picks-today' },
];

const navItems = [
  { name: 'AI Picks', href: '/daily-ai-picks', icon: Brain },
  { name: 'Daily Bets', href: '/daily-bets', icon: Zap },
  { name: 'Consensus', href: '/consensus', icon: Target },
  { name: 'Stats', href: '/stats', icon: TrendingUp },
  { name: 'All Picks', href: '/picks', icon: Calendar },
  { name: 'Blog', href: '/blog', icon: BarChart3 },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isPro, loading } = useSubscription();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">DailyAI</span>
            <span className="text-xs text-muted-foreground -mt-1">Betting</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1">
                Sports
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {sports.map((sport) => (
                <DropdownMenuItem key={sport.name} asChild>
                  <Link href={sport.href} className="flex items-center gap-2">
                    {sport.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {navItems.map((item) => (
            <Button key={item.name} variant="ghost" asChild>
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 border-primary/50">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs">Live</span>
          </Badge>

          {!loading && (
            <>
              {user ? (
                /* Logged in */
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      {isPro ? (
                        <Crown className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <span className="hidden md:inline text-xs truncate max-w-[120px]">
                        {user.email}
                      </span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isPro ? (
                      <DropdownMenuItem asChild>
                        <Link href="/pro" className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-emerald-400" />
                          Manage Pro
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem asChild>
                        <Link href="/pro" className="flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          Upgrade to Pro
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                /* Not logged in */
                <>
                  <Button size="sm" variant="ghost" className="hidden sm:flex" asChild>
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button size="sm" className="hidden sm:flex gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                    <Link href="/pro">
                      <Crown className="h-4 w-4" />
                      <span className="hidden md:inline">Try Pro Free</span>
                      <span className="md:hidden">Pro</span>
                    </Link>
                  </Button>
                </>
              )}
            </>
          )}

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-2 pb-4 border-b">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                    <Brain className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-lg font-bold">DailyAI Betting</span>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Sports</span>
                  <div className="flex flex-wrap gap-2">
                    {sports.map((sport) => (
                      <Button
                        key={sport.name}
                        variant="outline"
                        size="sm"
                        asChild
                        onClick={() => setIsOpen(false)}
                      >
                        <Link href={sport.href}>{sport.name}</Link>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 pt-4 border-t">
                  {navItems.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className="w-full justify-start gap-2"
                      asChild
                      onClick={() => setIsOpen(false)}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    </Button>
                  ))}
                </div>

                <div className="pt-4 border-t space-y-2">
                  {user ? (
                    <>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {isPro ? (
                        <Button className="w-full gap-2" variant="outline" asChild onClick={() => setIsOpen(false)}>
                          <Link href="/pro">
                            <Crown className="h-4 w-4 text-emerald-400" />
                            Manage Pro
                          </Link>
                        </Button>
                      ) : (
                        <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" asChild onClick={() => setIsOpen(false)}>
                          <Link href="/pro">
                            <Crown className="h-4 w-4" />
                            Upgrade to Pro
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" className="w-full gap-2" onClick={() => { handleSignOut(); setIsOpen(false); }}>
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full gap-2" asChild onClick={() => setIsOpen(false)}>
                        <Link href="/login">Sign in</Link>
                      </Button>
                      <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" asChild onClick={() => setIsOpen(false)}>
                        <Link href="/pro">
                          <Crown className="h-4 w-4" />
                          Try Pro Free
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

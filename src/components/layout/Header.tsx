'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
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
  User as UserIcon,
} from 'lucide-react';

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
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
          {/* Sports Dropdown */}
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

          {/* Main Nav Items */}
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
          {/* Live Badge */}
          <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 border-primary/50">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs">Live</span>
          </Badge>

          {/* Auth / Upgrade */}
          {user ? (
            <Button size="sm" variant="ghost" className="hidden sm:flex gap-1.5" asChild>
              <Link href="/account">
                <UserIcon className="h-4 w-4" />
                <span className="hidden md:inline">Account</span>
              </Link>
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="hidden sm:flex" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button size="sm" className="hidden sm:flex gap-1.5 bg-primary hover:bg-primary/90" asChild>
                <Link href="/pricing">
                  <Crown className="h-4 w-4" />
                  <span className="hidden md:inline">Go Premium</span>
                  <span className="md:hidden">Pro</span>
                </Link>
              </Button>
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

                {/* Sports Section */}
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

                {/* Nav Items */}
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

                {/* Auth / Upgrade */}
                <div className="pt-4 border-t space-y-2">
                  {user ? (
                    <Button className="w-full gap-2" variant="outline" asChild onClick={() => setIsOpen(false)}>
                      <Link href="/account">
                        <UserIcon className="h-4 w-4" />
                        Account
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button className="w-full gap-2" variant="outline" asChild onClick={() => setIsOpen(false)}>
                        <Link href="/auth/login">Sign In</Link>
                      </Button>
                      <Button className="w-full gap-2" asChild onClick={() => setIsOpen(false)}>
                        <Link href="/pricing">
                          <Crown className="h-4 w-4" />
                          Go Premium – $9.99/mo
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

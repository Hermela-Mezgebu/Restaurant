<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StaffMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        if (!$user || (!$user->isStaff() && !$user->isAdmin())) {
            return response()->json(['message' => 'Forbidden. Staff or admin access required.'], 403);
        }

        return $next($request);
    }
}

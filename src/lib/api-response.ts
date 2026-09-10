import { NextResponse } from 'next/server';

interface ApiEnvelope<T> {
    success: boolean;
    message: string;
    data: T | null;
    meta: null;
    error: { code: string } | null;
}

export function successResponse<T>(data: T, message = '', status = 200) {
    return NextResponse.json<ApiEnvelope<T>>({
        success: true,
        message,
        data,
        meta: null,
        error: null,
    }, { status });
}

export function failResponse(message: string, code: string, status: number) {
    return NextResponse.json<ApiEnvelope<never>>({
        success: false,
        message,
        data: null,
        meta: null,
        error: { code },
    }, { status });
}

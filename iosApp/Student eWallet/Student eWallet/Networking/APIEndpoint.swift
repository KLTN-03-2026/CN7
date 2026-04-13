//
//  APIEndpoint.swift
//  Student eWallet
//
//  Created by Mạc Văn Vinh on 13/4/26.
//

import Foundation
/// Centralized API endpoints for Student eWallet
enum APIEndpoint {
    // Auth
    case register(fullName: String, phone: String, password: String, email: String?)
    case login(phone: String, password: String)
    case verifyStudent(studentId: String)
    case getMe
}

// MARK: - Base URL
extension APIEndpoint {
    /// Configure your backend base URL here (no trailing slash)
    static var baseURL: URL { URL(string: "http://localhost:5001")! }
}
// MARK: - Path
extension APIEndpoint {
    private static var apiPrefix: String { "/api" }

    var path: String {
        switch self {
        case .register:
            return "\(Self.apiPrefix)/auth/register"
        case .login:
            return "\(Self.apiPrefix)/auth/login"
        case .verifyStudent:
            return "\(Self.apiPrefix)/auth/verify-student"
        case .getMe:
            return "\(Self.apiPrefix)/auth/me"
        }
    }
}

// MARK: - Method
extension APIEndpoint {
    var method: String {
        switch self {
        case .register, .login, .verifyStudent:
            return "POST"
        case .getMe:
            return "GET"
        }
    }
}

// MARK: - Query
extension APIEndpoint {
    var queryItems: [URLQueryItem]? {
        // Current endpoints do not use query parameters
        return nil
    }
}

// MARK: - Body
extension APIEndpoint {
    /// JSON body for endpoints that require it
    var jsonBody: [String: Any]? {
        switch self {
        case let .register(fullName, phone, password, email):
            var body: [String: Any] = [
                "fullName": fullName,
                "phone": phone,
                "password": password
            ]
            if let email, !email.isEmpty { body["email"] = email }
            return body
        case let .login(phone, password):
            return [
                "phone": phone,
                "password": password
            ]
        case let .verifyStudent(studentId):
            return [
                "studentId": studentId
            ]
        case .getMe:
            return nil
        }
    }
}

// MARK: - URLRequest builder
extension APIEndpoint {
    func urlRequest(token: String? = nil) throws -> URLRequest {
        var components = URLComponents(url: Self.baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        components.queryItems = queryItems
        guard let url = components.url else { throw URLError(.badURL) }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

        if let body = jsonBody {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
        }
        return request
    }
}


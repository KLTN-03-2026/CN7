//
//  AuthService.swift
//  Student eWallet
//
//  Created by Mạc Văn Vinh on 13/4/26.
//

import Foundation

// MARK: - Models
struct AuthUser: Codable {
    let id: String
    let fullName: String
    let phone: String
    let email: String?
    let role: String?
    let isVerified: Bool
    let studentId: String?
    let avatar: String?
}

struct AuthResponse: Codable {
    let success: Bool
    let message: String?
    let data: AuthData?
}

struct AuthData: Codable {
    let token: String?
    let user: AuthUser?
}

// MARK: - Errors
enum AuthError: Error, LocalizedError {
    case server(String)
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .server(let msg): return msg
        case .invalidResponse: return "Invalid response from server"
        }
    }
}

// MARK: - Token Store (in-memory only)
final class TokenStore {
    static let shared = TokenStore()
    private init() {}
    var token: String?
    func clear() { token = nil }
}

// MARK: - AuthService
final class AuthService {
    static let shared = AuthService()
    private init() {}

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    private func serverMessage(from data: Data, statusCode: Int?, defaultMessage: String) -> String {
        if let decoded = try? decoder.decode(AuthResponse.self, from: data), let msg = decoded.message, !msg.isEmpty {
            return msg
        }
        if let str = String(data: data, encoding: .utf8), !str.isEmpty {
            return str
        }
        if let code = statusCode {
            return "\(defaultMessage) (\(code))"
        }
        return defaultMessage
    }

    // Login
    func login(phone: String, password: String) async throws {
        let request = try APIEndpoint.login(phone: phone, password: password).urlRequest()
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AuthError.invalidResponse }

        if !(200..<300).contains(http.statusCode) {
            let message = serverMessage(from: data, statusCode: http.statusCode, defaultMessage: "Đăng nhập thất bại")
            throw AuthError.server(message)
        }

        do {
            let decoded = try decoder.decode(AuthResponse.self, from: data)
            if decoded.success, let token = decoded.data?.token {
                TokenStore.shared.token = token
            } else {
                let message = decoded.message ?? "Đăng nhập thất bại"
                throw AuthError.server(message)
            }
        } catch {
            let message = serverMessage(from: data, statusCode: http.statusCode, defaultMessage: "Phản hồi máy chủ không đúng định dạng")
            throw AuthError.server(message)
        }
    }

    // Register (do not auto-login)
    func register(fullName: String, phone: String, password: String, email: String?) async throws {
        let request = try APIEndpoint.register(fullName: fullName, phone: phone, password: password, email: email).urlRequest()
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AuthError.invalidResponse }

        // Treat 2xx as success; avoid failing on decoding when server returns plain text or a different schema
        if (200..<300).contains(http.statusCode) {
            if let decoded = try? decoder.decode(AuthResponse.self, from: data), decoded.success == false {
                throw AuthError.server(decoded.message ?? "Đăng ký thất bại")
            }
            return
        } else {
            let message = serverMessage(from: data, statusCode: http.statusCode, defaultMessage: "Đăng ký thất bại")
            throw AuthError.server(message)
        }
    }

    // Verify student (requires token)
    func verifyStudent(studentId: String) async throws {
        guard let token = TokenStore.shared.token else { throw AuthError.server("Chưa đăng nhập") }
        let request = try APIEndpoint.verifyStudent(studentId: studentId).urlRequest(token: token)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AuthError.invalidResponse }

        if !(200..<300).contains(http.statusCode) {
            let message = serverMessage(from: data, statusCode: http.statusCode, defaultMessage: "Xác thực sinh viên thất bại")
            throw AuthError.server(message)
        }

        if let decoded = try? decoder.decode(AuthResponse.self, from: data), decoded.success == false {
            throw AuthError.server(decoded.message ?? "Xác thực sinh viên thất bại")
        }
    }

    // Get current user
    func getMe() async throws -> AuthUser {
        guard let token = TokenStore.shared.token else { throw AuthError.server("Chưa đăng nhập") }
        let request = try APIEndpoint.getMe.urlRequest(token: token)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AuthError.invalidResponse }

        if !(200..<300).contains(http.statusCode) {
            let message = serverMessage(from: data, statusCode: http.statusCode, defaultMessage: "Không lấy được thông tin người dùng")
            throw AuthError.server(message)
        }

        do {
            let decoded = try decoder.decode(AuthResponse.self, from: data)
            if decoded.success, let user = decoded.data?.user {
                return user
            } else {
                let message = decoded.message ?? "Không lấy được thông tin người dùng"
                throw AuthError.server(message)
            }
        } catch {
            let message = serverMessage(from: data, statusCode: http.statusCode, defaultMessage: "Phản hồi máy chủ không đúng định dạng")
            throw AuthError.server(message)
        }
    }
}


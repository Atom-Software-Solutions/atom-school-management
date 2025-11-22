-- Initialize database schemas
CREATE SCHEMA IF NOT EXISTS user_mgt;
CREATE SCHEMA IF NOT EXISTS payment_mgt;
CREATE SCHEMA IF NOT EXISTS student_mgt;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA user_mgt TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA payment_mgt TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA student_mgt TO postgres;
